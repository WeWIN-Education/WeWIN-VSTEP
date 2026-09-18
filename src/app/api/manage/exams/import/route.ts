import { getCurrentUser } from "@/lib/access";
import { isSameOrigin } from "@/lib/request-security";
import { prisma } from "@/lib/prisma";
import { parseVstepDocx } from "@/lib/vstep-import";
import { deleteObject, putObject } from "@/lib/storage";
import type { StoredVstepPublic } from "@/lib/vstep-paper";
import type { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;
const mimeByExtension: Record<string,string> = { ".mp3":"audio/mpeg", ".wav":"audio/wav", ".m4a":"audio/mp4", ".mp4":"audio/mp4", ".ogg":"audio/ogg", ".webm":"audio/webm" };

function fileName(file: File) { return path.basename(file.name).normalize("NFC"); }
function audioSignature(bytes: Buffer, extension: string) {
  if (extension === ".wav") return bytes.subarray(0,4).toString("ascii") === "RIFF" && bytes.subarray(8,12).toString("ascii") === "WAVE";
  if (extension === ".ogg") return bytes.subarray(0,4).toString("ascii") === "OggS";
  if (extension === ".webm") return bytes.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]));
  if (extension === ".m4a" || extension === ".mp4") return bytes.subarray(4,8).toString("ascii") === "ftyp";
  if (extension === ".mp3") return bytes.subarray(0,3).toString("ascii") === "ID3" || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
  return false;
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
  try {
    const form = await request.formData();
    const docx = form.get("docx");
    const mode = String(form.get("mode") || "preview");
    if (!(docx instanceof File) || !docx.name.toLowerCase().endsWith(".docx")) return NextResponse.json({ error: "Hãy chọn file DOCX." }, { status: 400 });
    if (docx.size > 20 * 1024 * 1024) return NextResponse.json({ error: "File DOCX vượt quá 20 MB." }, { status: 413 });
    const audio = form.getAll("audio").filter((item): item is File => item instanceof File && item.size > 0);
    if (audio.some(file => file.size > 25 * 1024 * 1024) || audio.reduce((sum,file)=>sum+file.size,0) > 100 * 1024 * 1024) return NextResponse.json({ error: "Mỗi audio tối đa 25 MB, tổng tối đa 100 MB." }, { status: 413 });
    const names = new Map<string,File>();
    for (const file of audio) {
      const name = fileName(file), extension = path.extname(name).toLowerCase();
      if (!mimeByExtension[extension]) return NextResponse.json({ error: `${name}: chỉ nhận MP3, WAV, M4A, MP4, OGG hoặc WEBM.` }, { status: 400 });
      if (names.has(name.toLowerCase())) return NextResponse.json({ error: `Tên audio bị trùng: ${name}.` }, { status: 400 });
      names.set(name.toLowerCase(), file);
    }
    const parsed = await parseVstepDocx(Buffer.from(await docx.arrayBuffer()));
    const missingAudio = parsed.audioNames.filter(name => !names.has(path.basename(name).normalize("NFC").toLowerCase()));
    const unusedAudio = [...names.values()].map(fileName).filter(name => !parsed.audioNames.some(required => required.toLowerCase() === name.toLowerCase()));
    if (mode !== "publish") return NextResponse.json({ valid: missingAudio.length === 0, paper: parsed.paper, requiredAudio: parsed.audioNames, missingAudio, unusedAudio, warnings: parsed.warnings });
    if (missingAudio.length) return NextResponse.json({ error: `Thiếu audio: ${missingAudio.join(", ")}.`, missingAudio }, { status: 400 });
    const existing = await prisma.examPaper.findUnique({ where: { programme_slug: { programme: "VSTEP", slug: parsed.paper.slug } }, select: { id: true } });
    const created: string[] = [], urlByName = new Map<string,string>();
    try {
      const requiredNames=new Set(parsed.audioNames.map(name=>path.basename(name).normalize("NFC").toLowerCase()));
      for (const [name,file] of names) {
        if(!requiredNames.has(name))continue;
        const extension = path.extname(file.name).toLowerCase();
        const bytes=Buffer.from(await file.arrayBuffer());
        if(!audioSignature(bytes,extension))throw new Error(`${fileName(file)} không phải file audio ${extension.slice(1).toUpperCase()} hợp lệ.`);
        const mediaId = `${randomUUID()}${extension}`;
        const storageKey = `exams/${mediaId}`;
        await putObject(storageKey, bytes, mimeByExtension[extension]);
        created.push(storageKey); urlByName.set(name, `/api/exams/media/${mediaId}`);
      }
      const paper: StoredVstepPublic = structuredClone(parsed.paper);
      paper.listening.parts.forEach(part => { part.audioUrl = urlByName.get(path.basename(part.audioUrl).toLowerCase()) || part.audioUrl; });
      paper.speaking.parts.forEach(part => { if (part.audioUrl) part.audioUrl = urlByName.get(path.basename(part.audioUrl).toLowerCase()) || part.audioUrl; });
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
      return NextResponse.json({ published: true, updated: Boolean(existing), id: record.id, slug: record.slug, url: `/exam/vstep/${record.slug}`, warnings: parsed.warnings, unusedAudio });
    } catch (error) {
      await Promise.allSettled(created.map((key) => deleteObject(key)));
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không đọc được file đề.";
    return NextResponse.json({ error: message, errors: message.split("\n") }, { status: 400 });
  }
}
