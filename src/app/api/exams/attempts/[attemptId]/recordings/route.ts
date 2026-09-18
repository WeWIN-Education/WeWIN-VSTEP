import { getAttemptOwner, ownerWhere } from "@/lib/exam-attempt-access";
import { consumeGuestRateLimit, guestRateLimitResponse } from "@/lib/guest-exams";
import { object } from "@/lib/exam-submission";
import { resolveCatalogExamData } from "@/lib/exam-scoring";
import { isBlobStorageEnabled, putObject } from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_RECORDING_BYTES = 20 * 1024 * 1024;
const MIME_TYPES = new Map([
  ["audio/webm", ".webm"],
  ["audio/ogg", ".ogg"],
  ["audio/mp4", ".m4a"],
  ["audio/m4a", ".m4a"],
  ["audio/wav", ".wav"],
  ["audio/x-wav", ".wav"],
  ["audio/mpeg", ".mp3"],
]);

function contentType(value: string) {
  return value.split(";", 1)[0].toLowerCase();
}

function playbackUrl(attemptId: string, partId: string) {
  return `/api/exams/attempts/${encodeURIComponent(attemptId)}/recordings/${encodeURIComponent(partId)}`;
}

async function getSpeakingAttempt(attemptId: string, owner: Awaited<ReturnType<typeof getAttemptOwner>>) {
  if (!owner || owner.kind === "invalid") return null;
  const attempt = await prisma.examAttempt.findFirst({
    where: { id: attemptId, ...ownerWhere(owner), status: "IN_PROGRESS" },
    include: {
      examPaper: { select: { slug: true, sections: true, questions: true } },
      paperPart: { select: { sections: true, questions: true } },
    },
  });
  if (!attempt) return null;
  const exam = resolveCatalogExamData({
    slug: attempt.examPaper.slug,
    sections: attempt.examPaper.sections,
    questions: attempt.examPaper.questions,
    catalog: attempt.catalog,
    partSections: attempt.paperPart?.sections,
    partQuestions: attempt.paperPart?.questions,
  });
  if (!exam) return null;
  return { attempt, paper: exam.paper };
}

export async function POST(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const owner = await getAttemptOwner();
  if (!owner || owner.kind === "invalid") return NextResponse.json({ error: "Phiên đăng nhập hoặc phiên học thử đã hết hạn." }, { status: 401 });
  if (owner.kind === "guest") {
    const rate = await consumeGuestRateLimit(request, "speaking-upload", 60, owner.guestSessionId);
    if (!rate.allowed) return NextResponse.json({ error: "Bạn thao tác quá nhanh. Hãy thử lại sau ít phút." }, { status: 429, headers: guestRateLimitResponse(rate) });
  }
  if (isBlobStorageEnabled()) return NextResponse.json({ error: "Môi trường production yêu cầu upload trực tiếp lên Blob." }, { status: 409 });

  const { attemptId } = await params;
  const target = await getSpeakingAttempt(attemptId, owner);
  if (!target) return NextResponse.json({ error: "Lượt thi không tồn tại hoặc đã nộp." }, { status: 404 });

  try {
    const form = await request.formData();
    const partId = String(form.get("partId") || "").trim();
    const file = form.get("file");
    const part = target.paper.speaking.parts.find((item) => item.id === partId);
    if (!part) return NextResponse.json({ error: "Phần Speaking không hợp lệ." }, { status: 400 });
    if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Không có dữ liệu ghi âm." }, { status: 400 });
    if (file.size > MAX_RECORDING_BYTES) return NextResponse.json({ error: "Bản ghi vượt quá 20 MB." }, { status: 413 });
    const type = contentType(file.type || "audio/webm");
    const extension = MIME_TYPES.get(type);
    if (!extension) return NextResponse.json({ error: "Định dạng bản ghi chưa được hỗ trợ." }, { status: 400 });

    const key = `exam-recordings/${attemptId}/${partId}-${randomUUID()}${extension}`;
    const stored = await putObject(key, Buffer.from(await file.arrayBuffer()), type);
    const durationSeconds = Math.max(1, Math.min(600, Number(form.get("durationSeconds") || 0) || 1));
    const metadata = {
      ...object(target.attempt.recordings),
      [partId]: {
        startedAt: String(form.get("startedAt") || new Date().toISOString()),
        stoppedAt: String(form.get("stoppedAt") || new Date().toISOString()),
        durationSeconds,
        storageKey: stored.key,
        storageUrl: stored.url,
        mimeType: stored.contentType,
        sizeBytes: stored.sizeBytes,
        status: "SAVED",
        playbackUrl: playbackUrl(attemptId, partId),
      },
    };
    await prisma.$transaction(async (tx) => {
      await tx.examRecording.upsert({
        where: { attemptId_partId: { attemptId, partId } },
        create: { attemptId, partId, storageKey: stored.key, storageUrl: stored.url, mimeType: stored.contentType, sizeBytes: stored.sizeBytes, durationSeconds, status: "SAVED" },
        update: { storageKey: stored.key, storageUrl: stored.url, mimeType: stored.contentType, sizeBytes: stored.sizeBytes, durationSeconds, status: "SAVED" },
      });
      await tx.examAttempt.update({ where: { id: attemptId }, data: { recordings: metadata as Prisma.InputJsonObject } });
    });

    return NextResponse.json({ recording: { partId, ...(metadata[partId] as Record<string, unknown>), playbackUrl: playbackUrl(attemptId, partId) } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể lưu bản ghi." }, { status: 400 });
  }
}
