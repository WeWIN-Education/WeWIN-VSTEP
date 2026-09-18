import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "../src/lib/prisma";
import { importVocabularyRows, parseVocabularyWorkbook } from "../src/lib/vocabulary-import";

const files = process.argv.slice(2);
const uploaderEmail = process.env.SEED_MANAGER_EMAIL ?? process.env.SEED_DEMO_EMAIL ?? "teacher.demo@wewin.local";

async function main() {
  if (!files.length) throw new Error("Usage: npx tsx scripts/import-vocabulary.ts <file.xlsx> [file.xlsx]");
  const uploader = await prisma.user.findUnique({ where: { email: uploaderEmail.toLowerCase() } });
  if (!uploader) throw new Error(`Không tìm thấy user ${uploaderEmail}.`);
  for (const file of files) {
    const absolute = path.resolve(file);
    const buffer = await fs.readFile(absolute);
    const parsed = parseVocabularyWorkbook(buffer, path.basename(absolute));
    const summary = await importVocabularyRows({ prisma, uploadedById: uploader.id, fileName: path.basename(absolute), ...parsed });
    console.log(JSON.stringify(summary));
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
