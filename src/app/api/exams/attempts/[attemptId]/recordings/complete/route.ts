import { getAttemptOwner, ownerWhere } from "@/lib/exam-attempt-access";
import { consumeGuestRateLimit, guestRateLimitResponse } from "@/lib/guest-exams";
import { object } from "@/lib/exam-submission";
import { resolveCatalogExamData } from "@/lib/exam-scoring";
import { headObject, isBlobStorageEnabled } from "@/lib/storage";
import { isSameOrigin } from "@/lib/request-security";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const allowedContentTypes = new Set(["audio/webm", "audio/ogg", "audio/mp4", "audio/m4a", "audio/wav", "audio/x-wav", "audio/mpeg"]);
const MAX_RECORDING_BYTES = 20 * 1024 * 1024;

function playbackUrl(attemptId: string, partId: string) {
  return `/api/exams/attempts/${encodeURIComponent(attemptId)}/recordings/${encodeURIComponent(partId)}`;
}

export async function POST(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  const owner = await getAttemptOwner();
  if (!owner || owner.kind === "invalid") return NextResponse.json({ error: "Phiên đăng nhập hoặc phiên học thử đã hết hạn." }, { status: 401 });
  if (owner.kind === "guest") {
    const rate = await consumeGuestRateLimit(request, "speaking-upload-complete", 60, owner.guestSessionId);
    if (!rate.allowed) return NextResponse.json({ error: "Bạn thao tác quá nhanh. Hãy thử lại sau ít phút." }, { status: 429, headers: guestRateLimitResponse(rate) });
  }
  if (!isBlobStorageEnabled()) return NextResponse.json({ error: "Blob storage chưa được cấu hình." }, { status: 503 });

  const { attemptId } = await params;
  const attempt = await prisma.examAttempt.findFirst({
    where: { id: attemptId, ...ownerWhere(owner), status: "IN_PROGRESS" },
    include: { examPaper: { select: { slug: true, sections: true, questions: true } }, paperPart: { select: { sections: true, questions: true } } },
  });
  if (!attempt) return NextResponse.json({ error: "Lượt thi không tồn tại hoặc đã nộp." }, { status: 404 });
  const exam = resolveCatalogExamData({ slug: attempt.examPaper.slug, sections: attempt.examPaper.sections, questions: attempt.examPaper.questions, catalog: attempt.catalog, partSections: attempt.paperPart?.sections, partQuestions: attempt.paperPart?.questions });
  if (!exam) return NextResponse.json({ error: "Nội dung đề không hợp lệ." }, { status: 409 });

  try {
    const body = await request.json() as { partId?: string; pathname?: string; url?: string; startedAt?: string; stoppedAt?: string; durationSeconds?: number };
    const partId = String(body.partId || "").trim();
    const pathname = String(body.pathname || "").trim();
    if (!exam.paper.speaking.parts.some((part) => part.id === partId)) return NextResponse.json({ error: "Phần Speaking không hợp lệ." }, { status: 400 });
    if (!pathname.startsWith(`exam-recordings/${attemptId}/${partId}-`)) return NextResponse.json({ error: "Blob không thuộc phần Speaking này." }, { status: 400 });

    const stored = await headObject(pathname);
    if (!stored || stored.sizeBytes <= 0) return NextResponse.json({ error: "Không tìm thấy audio vừa upload." }, { status: 404 });
    if (stored.sizeBytes > MAX_RECORDING_BYTES) return NextResponse.json({ error: "Bản ghi vượt quá 20 MB." }, { status: 413 });
    const type = stored.contentType.split(";", 1)[0].toLowerCase();
    if (!allowedContentTypes.has(type)) return NextResponse.json({ error: "Định dạng bản ghi chưa được hỗ trợ." }, { status: 400 });
    const durationSeconds = Math.max(1, Math.min(600, Number(body.durationSeconds || 0) || 1));
    const metadata = {
      ...object(attempt.recordings),
      [partId]: {
        startedAt: body.startedAt || new Date().toISOString(),
        stoppedAt: body.stoppedAt || new Date().toISOString(),
        durationSeconds,
        storageKey: stored.key,
        storageUrl: typeof body.url === "string" ? body.url : stored.url,
        mimeType: type,
        sizeBytes: stored.sizeBytes,
        status: "SAVED",
        playbackUrl: playbackUrl(attemptId, partId),
      },
    };
    await prisma.$transaction(async (tx) => {
      await tx.examRecording.upsert({
        where: { attemptId_partId: { attemptId, partId } },
        create: { attemptId, partId, storageKey: stored.key, storageUrl: stored.url, mimeType: type, sizeBytes: stored.sizeBytes, durationSeconds, status: "SAVED" },
        update: { storageKey: stored.key, storageUrl: stored.url, mimeType: type, sizeBytes: stored.sizeBytes, durationSeconds, status: "SAVED" },
      });
      await tx.examAttempt.update({ where: { id: attemptId }, data: { recordings: metadata as Prisma.InputJsonObject } });
    });

    return NextResponse.json({ recording: { partId, ...(metadata[partId] as Record<string, unknown>), playbackUrl: playbackUrl(attemptId, partId) } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể hoàn tất upload." }, { status: 400 });
  }
}
