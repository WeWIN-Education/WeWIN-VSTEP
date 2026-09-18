import "dotenv/config";

import { prisma } from "../src/lib/prisma";
import { putObject } from "../src/lib/storage";
import { readStoredPaper } from "../src/lib/vstep-paper";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

const dataRoot = path.join(process.cwd(), ".data");
const dryRun = process.argv.includes("--dry-run");
const mimeByExtension: Record<string, string> = { ".mp3": "audio/mpeg", ".wav": "audio/wav", ".m4a": "audio/mp4", ".mp4": "audio/mp4", ".ogg": "audio/ogg", ".webm": "audio/webm", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".pdf": "application/pdf", ".doc": "application/msword", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };

async function exists(filePath: string) {
  try { await access(filePath); return true; } catch { return false; }
}

async function migrateFile(namespace: string, fileName: string) {
  const source = path.join(dataRoot, namespace, path.basename(fileName));
  if (!(await exists(source))) return false;
  const key = `${namespace}/${path.basename(fileName)}`;
  if (dryRun) { console.log(JSON.stringify({ namespace, fileName, action: "WOULD_UPLOAD" })); return true; }
  const bytes = await readFile(source);
  const extension = path.extname(fileName).toLowerCase();
  await putObject(key, bytes, mimeByExtension[extension] || "application/octet-stream");
  console.log(JSON.stringify({ namespace, fileName, bytes: bytes.length, action: "UPLOADED" }));
  return true;
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN phải được cấu hình trước khi migrate local storage.");
  const papers = await prisma.examPaper.findMany({ select: { sections: true } });
  const mediaNames = new Set<string>();
  for (const paper of papers) {
    const stored = readStoredPaper(paper.sections);
    if (!stored) continue;
    for (const url of [...stored.listening.parts.map((part) => part.audioUrl), ...stored.speaking.parts.map((part) => part.audioUrl)]) {
      if (typeof url !== "string") continue;
      const match = url.match(/^\/api\/exams\/media\/(.+)$/);
      if (match) mediaNames.add(path.basename(match[1]));
    }
  }
  for (const name of mediaNames) await migrateFile("exams", name);

  const materials = await prisma.learningMaterial.findMany({ select: { id: true, storageName: true } });
  for (const material of materials) {
    const name = path.basename(material.storageName);
    const migrated = await migrateFile("materials", name);
    if (migrated && !dryRun && material.storageName !== `materials/${name}`) await prisma.learningMaterial.update({ where: { id: material.id }, data: { storageName: `materials/${name}` } });
  }

  const posts = await prisma.userPost.findMany({ where: { imageUrl: { not: null } }, select: { imageUrl: true } });
  for (const post of posts) if (post.imageUrl) await migrateFile("posts", path.basename(post.imageUrl));
  console.log(JSON.stringify({ dryRun, completed: true }));
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
