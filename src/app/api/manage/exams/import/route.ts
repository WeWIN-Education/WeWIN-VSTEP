import { getCurrentUser } from "@/lib/access";
import { isSameOrigin } from "@/lib/request-security";
import { deleteObject, getObject, headObject, putObject } from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import { parseVstepDocx } from "@/lib/vstep-import";
import type { StoredVstepPublic } from "@/lib/vstep-paper";
import type { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const mimeByExtension: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".mp4": "audio/mp4",
  ".ogg": "audio/ogg",
  ".webm": "audio/webm",
};
const alternateMimeTypes: Record<string, string[]> = {
  ".wav": ["audio/x-wav"],
  ".m4a": ["audio/m4a"],
  ".mp4": ["video/mp4"],
  ".webm": ["video/webm"],
};
const MAX_AUDIO_SIZE = 25 * 1024 * 1024;
const MAX_AUDIO_TOTAL = 100 * 1024 * 1024;

type AudioReference = { name?: unknown; pathname?: unknown };
type AudioSource = { name: string; file?: File; pathname?: string };

function baseName(value: string) {
  return path.posix.basename(value.replace(/\\/g, "/")).normalize("NFC");
}

function fileName(file: File) {
  return baseName(file.name);
}

function audioKey(value: string) {
  return baseName(value).toLowerCase();
}

function audioSignature(bytes: Buffer, extension: string) {
  if (extension === ".wav") return bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WAVE";
  if (extension === ".ogg") return bytes.subarray(0, 4).toString("ascii") === "OggS";
  if (extension === ".webm") return bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  if (extension === ".m4a" || extension === ".mp4") return bytes.subarray(4, 8).toString("ascii") === "ftyp";
  if (extension === ".mp3") return bytes.subarray(0, 3).toString("ascii") === "ID3" || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
  return false;
}

async function readObjectPrefix(key: string, length = 12) {
  const object = await getObject(key, { range: { start: 0, end: length - 1 } });
  if (!object) return null;
  const reader = object.stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (size < length) {
      const next = await reader.read();
      if (next.done) break;
      chunks.push(next.value);
      size += next.value.byteLength;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).subarray(0, length);
}

async function storedAudioIsValid(pathname: string, extension: string) {
  const prefix = await readObjectPrefix(pathname);
  return Boolean(prefix && audioSignature(prefix, extension));
}

function parseAudioNames(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").map(baseName) : [];
  } catch {
    return [];
  }
}

function parseAudioReferences(value: FormDataEntryValue | null): AudioReference[] {
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is AudioReference => Boolean(item && typeof item === "object")) : [];
  } catch {
    return [];
  }
}

function validBlobPath(pathname: string) {
  const extension = path.posix.extname(pathname).toLowerCase();
  return /^exams\/[a-f0-9-]{36}\.[a-z0-9]+$/i.test(pathname) && Boolean(mimeByExtension[extension]);
}

function validStoredContentType(extension: string, contentType: string) {
  return contentType === mimeByExtension[extension] || alternateMimeTypes[extension]?.includes(contentType) === true;
}

function partSeeds(paper: StoredVstepPublic, privateData: unknown) {
  return [
    {
      catalog: "FULL" as const,
      skill: null,
      title: "Full Test",
      durationMin: paper.durationMinutes,
      questionCount: paper.questionCount,
      sections: paper,
      questions: privateData,
      sortOrder: 0,
    },
    {
      catalog: "LISTENING" as const,
      skill: "LISTENING" as const,
      title: "Listening",
      durationMin: paper.listening.parts.reduce((sum, part) => sum + Math.ceil(part.durationSeconds / 60), 0),
      questionCount: paper.listening.parts.reduce((sum, part) => sum + part.questions.length, 0),
      sections: { listening: paper.listening },
      questions: { answerKey: Object.fromEntries(paper.listening.parts.flatMap((part) => part.questions).map((question) => [question.id, (privateData as { answerKey?: Record<string, unknown> }).answerKey?.[question.id]])) },
      sortOrder: 1,
    },
    {
      catalog: "READING" as const,
      skill: "READING" as const,
      title: "Reading",
      durationMin: 60,
      questionCount: paper.reading.passages.reduce((sum, passage) => sum + passage.questions.length, 0),
      sections: { reading: paper.reading },
      questions: { answerKey: Object.fromEntries(paper.reading.passages.flatMap((passage) => passage.questions).map((question) => [question.id, (privateData as { answerKey?: Record<string, unknown> }).answerKey?.[question.id]])) },
      sortOrder: 2,
    },
    {
      catalog: "WRITING" as const,
      skill: "WRITING" as const,
      title: "Writing",
      durationMin: paper.writing.reduce((sum, task) => sum + task.durationMinutes, 0),
      questionCount: paper.writing.length,
      sections: { writing: paper.writing },
      questions: null,
      sortOrder: 3,
    },
    {
      catalog: "SPEAKING" as const,
      skill: "SPEAKING" as const,
      title: "Speaking",
      durationMin: Math.ceil(paper.speaking.parts.reduce((sum, part) => sum + (part.preparationSeconds || 0) + (part.speakingSeconds || 0), 0) / 60),
      questionCount: paper.speaking.parts.length,
      sections: { speaking: paper.speaking },
      questions: null,
      sortOrder: 4,
    },
  ];
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  if (actor.role !== "ADMIN") return NextResponse.json({ error: "Chỉ admin được nhập đề." }, { status: 403 });

  const created: string[] = [];
  try {
    const form = await request.formData();
    const docx = form.get("docx");
    const mode = String(form.get("mode") || "preview");
    if (!(docx instanceof File) || !docx.name.toLowerCase().endsWith(".docx")) return NextResponse.json({ error: "Hãy chọn file DOCX." }, { status: 400 });
    if (docx.size > 20 * 1024 * 1024) return NextResponse.json({ error: "File DOCX vượt quá 20 MB." }, { status: 413 });

    const selectedNames = new Set(parseAudioNames(form.get("audioNames")).map(audioKey));
    const legacyFiles = form.getAll("audio").filter((item): item is File => item instanceof File && item.size > 0);
    const references = parseAudioReferences(form.get("audioRefs"));
    const sources = new Map<string, AudioSource>();
    let totalAudioSize = 0;

    for (const file of legacyFiles) {
      const name = fileName(file);
      const key = audioKey(name);
      const extension = path.extname(name).toLowerCase();
      if (!mimeByExtension[extension]) return NextResponse.json({ error: `${name}: chỉ nhận MP3, WAV, M4A, MP4, OGG hoặc WEBM.` }, { status: 400 });
      if (file.size > MAX_AUDIO_SIZE) return NextResponse.json({ error: `${name}: vượt quá giới hạn 25 MB.` }, { status: 413 });
      if (sources.has(key)) return NextResponse.json({ error: `Tên audio bị trùng: ${name}.` }, { status: 400 });
      totalAudioSize += file.size;
      sources.set(key, { name, file });
    }

    for (const reference of references) {
      const name = typeof reference.name === "string" ? baseName(reference.name) : "";
      const pathname = typeof reference.pathname === "string" ? reference.pathname : "";
      const key = audioKey(name);
      const extension = path.extname(name).toLowerCase();
      if (!name || !validBlobPath(pathname) || path.posix.extname(pathname).toLowerCase() !== extension || !mimeByExtension[extension]) {
        return NextResponse.json({ error: `${name || "Audio"}: tham chiếu Blob không hợp lệ.` }, { status: 400 });
      }
      if (sources.has(key)) return NextResponse.json({ error: `Tên audio bị trùng: ${name}.` }, { status: 400 });
      const stored = await headObject(pathname);
      if (!stored || stored.sizeBytes <= 0 || stored.sizeBytes > MAX_AUDIO_SIZE || !validStoredContentType(extension, stored.contentType)) {
        return NextResponse.json({ error: `${name}: Blob audio không tồn tại hoặc sai định dạng.` }, { status: 400 });
      }
      totalAudioSize += stored.sizeBytes;
      if (mode === "publish") created.push(pathname);
      sources.set(key, { name, pathname });
    }

    if (totalAudioSize > MAX_AUDIO_TOTAL) return NextResponse.json({ error: "Tổng audio vượt quá giới hạn 100 MB." }, { status: 413 });
    for (const name of selectedNames) {
      if (!sources.has(name)) sources.set(name, { name });
    }

    const parsed = await parseVstepDocx(Buffer.from(await docx.arrayBuffer()));
    const missingAudio = parsed.audioNames.filter((name) => !sources.has(audioKey(name)));
    const requiredKeys = new Set(parsed.audioNames.map(audioKey));
    const unusedAudio = [...sources.values()].filter((source) => !requiredKeys.has(audioKey(source.name))).map((source) => source.name);
    if (mode !== "publish") return NextResponse.json({ valid: missingAudio.length === 0, paper: parsed.paper, requiredAudio: parsed.audioNames, missingAudio, unusedAudio, warnings: parsed.warnings });
    if (missingAudio.length) return NextResponse.json({ error: `Thiếu audio: ${missingAudio.join(", ")}.`, missingAudio }, { status: 400 });

    const existing = await prisma.examPaper.findUnique({ where: { programme_slug: { programme: "VSTEP", slug: parsed.paper.slug } }, select: { id: true } });
    const urlByName = new Map<string, string>();
    try {
      for (const name of parsed.audioNames) {
        const source = sources.get(audioKey(name));
        if (!source) continue;
        const extension = path.extname(source.name).toLowerCase();
        let mediaId = "";
        if (source.pathname) {
          if (!(await storedAudioIsValid(source.pathname, extension))) throw new Error(`${source.name} không phải file audio ${extension.slice(1).toUpperCase()} hợp lệ.`);
          mediaId = path.posix.basename(source.pathname);
        } else if (source.file) {
          const bytes = Buffer.from(await source.file.arrayBuffer());
          if (!audioSignature(bytes, extension)) throw new Error(`${source.name} không phải file audio ${extension.slice(1).toUpperCase()} hợp lệ.`);
          mediaId = `${randomUUID()}${extension}`;
          const storageKey = `exams/${mediaId}`;
          await putObject(storageKey, bytes, mimeByExtension[extension]);
          created.push(storageKey);
        } else {
          throw new Error(`Không tìm thấy dữ liệu audio ${source.name}.`);
        }
        urlByName.set(audioKey(name), `/api/exams/media/${mediaId}`);
      }

      const paper: StoredVstepPublic = structuredClone(parsed.paper);
      paper.listening.parts.forEach((part) => { part.audioUrl = urlByName.get(audioKey(part.audioUrl)) || part.audioUrl; });
      paper.speaking.parts.forEach((part) => { if (part.audioUrl) part.audioUrl = urlByName.get(audioKey(part.audioUrl)) || part.audioUrl; });
      const privateData = { ...parsed.privateData, sourceName: fileName(docx) };
      const record = await prisma.$transaction(async (tx) => {
        const saved = existing
          ? await tx.examPaper.update({
              where: { id: existing.id },
              data: { title: paper.title, subtitle: paper.subtitle, target: paper.target, durationMin: paper.durationMinutes, questionCount: paper.questionCount, status: "PUBLISHED", sections: paper as unknown as Prisma.InputJsonObject, questions: privateData as unknown as Prisma.InputJsonObject },
            })
          : await tx.examPaper.create({
              data: { programme: "VSTEP", slug: paper.slug, title: paper.title, subtitle: paper.subtitle, target: paper.target, durationMin: paper.durationMinutes, questionCount: paper.questionCount, status: "PUBLISHED", sections: paper as unknown as Prisma.InputJsonObject, questions: privateData as unknown as Prisma.InputJsonObject },
            });

        for (const part of partSeeds(paper, parsed.privateData)) {
          await tx.examPaperPart.upsert({
            where: { examPaperId_catalog: { examPaperId: saved.id, catalog: part.catalog } },
            create: { examPaperId: saved.id, ...part, sections: part.sections as unknown as Prisma.InputJsonValue, questions: part.questions as unknown as Prisma.InputJsonValue },
            update: { skill: part.skill, title: part.title, durationMin: part.durationMin, questionCount: part.questionCount, sections: part.sections as unknown as Prisma.InputJsonValue, questions: part.questions as unknown as Prisma.InputJsonValue, sortOrder: part.sortOrder },
          });
        }
        return saved;
      });
      await Promise.allSettled([...sources.values()]
        .filter((source) => source.pathname && !requiredKeys.has(audioKey(source.name)))
        .map((source) => deleteObject(source.pathname!)));
      return NextResponse.json({ published: true, updated: Boolean(existing), id: record.id, slug: record.slug, url: `/exam/vstep/${record.slug}`, warnings: parsed.warnings, unusedAudio });
    } catch (error) {
      await Promise.allSettled(created.map((key) => deleteObject(key)));
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không đọc được file đề.";
    return NextResponse.json({ error: message, errors: message.split("\n").filter(Boolean) }, { status: 400 });
  }
}
