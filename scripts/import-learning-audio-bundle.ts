import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { parseContentFile } from "../src/lib/learning-content";
import { validateLearningAudio } from "../src/lib/learning-audio";
import { LEARNING_AUDIO_BUNDLE, LEARNING_AUDIO_BUNDLE_ID } from "../src/lib/learning-audio-bundle";
import { deleteObject, headObject, putObject } from "../src/lib/storage";

export async function importLearningAudioBundle() {
  // Preview builds must never import content into a shared production database.
  if (process.env.VERCEL_ENV !== "production") {
    console.log("Audio bundle: skipped outside Vercel production.");
    return;
  }
  const db = new PrismaClient({ log: [] });
  const uploaded: string[] = [];
  try {
    if (await db.learningContentImport.findUnique({ where: { id: LEARNING_AUDIO_BUNDLE_ID } })) {
      console.log("Audio bundle: already imported; administrator edits/deletions preserved.");
      return;
    }
    if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("Blob storage is required");
    const root = path.join(process.cwd(), "content", "vstep");
    const lessons = [
      ...parseContentFile(await readFile(path.join(root, "ky-nang-vstep-b1-b2-v1.txt"), "utf8"), "SKILL"),
      ...parseContentFile(await readFile(path.join(root, "bai-tap-vstep-b1-b2-v1.txt"), "utf8"), "EXERCISE"),
    ];
    const audio = await Promise.all(LEARNING_AUDIO_BUNDLE.map(async entry => {
      if (!lessons.some(item => item.kind === entry.kind && item.code === entry.code)) throw new Error("Missing content mapping");
      const bytes = await readFile(path.join(root, "audio", entry.file));
      validateLearningAudio(entry.file, bytes);
      return { ...entry, bytes };
    }));
    const result = await db.$transaction(async tx => {
      // Serializes concurrent deployments; the marker commits together with every attachment.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(9212026)`;
      if (await tx.learningContentImport.findUnique({ where: { id: LEARNING_AUDIO_BUNDLE_ID } })) return null;
      const created = await tx.learningContent.createMany({ data: lessons, skipDuplicates: true });
      let attached = 0;
      for (const entry of audio) {
        const item = await tx.learningContent.findUniqueOrThrow({ where: { kind_code: { kind: entry.kind, code: entry.code } } });
        if (item.audioKey) continue;
        const key = `learning-audio/${item.id}/${randomUUID()}.mp3`;
        uploaded.push(key);
        await putObject(key, entry.bytes, "audio/mpeg");
        const meta = await headObject(key);
        if (!meta || meta.sizeBytes !== entry.bytes.length) throw new Error("Audio verification failed");
        // Do not replace an attachment created by an administrator during this deployment.
        const saved = await tx.learningContent.updateMany({ where: { id: item.id, audioKey: null }, data: { audioKey: key, audioName: entry.file } });
        if (!saved.count) throw new Error("Content changed during import");
        attached++;
      }
      await tx.learningContentImport.create({ data: { id: LEARNING_AUDIO_BUNDLE_ID } });
      return { created: created.count, attached };
    }, { timeout: 180000, maxWait: 10000 });
    console.log("Audio bundle imported:", result ?? "completed by another deployment");
  } catch {
    // A lost commit acknowledgement does not prove rollback. Never remove potentially attached audio.
    const committed = await db.learningContentImport.findUnique({ where: { id: LEARNING_AUDIO_BUNDLE_ID } }).catch(() => undefined);
    if (committed) {
      console.log("Audio bundle: committed marker verified after connection interruption.");
    } else {
      if (committed === null) await Promise.all(uploaded.map(key => deleteObject(key).catch(() => console.error("Audio bundle cleanup requires administrator attention."))));
      console.error("Audio bundle import incomplete. Verify database, Blob configuration, and import marker before retrying. Existing content was not overwritten.");
      process.exitCode = 1;
    }
  } finally { await db.$disconnect(); }
}
if (process.argv[1]?.replace(/\\/g, "/").endsWith("/import-learning-audio-bundle.ts")) void importLearningAudioBundle();
