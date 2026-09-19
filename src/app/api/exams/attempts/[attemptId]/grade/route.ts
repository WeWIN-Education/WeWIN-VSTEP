import { getAttemptOwner, ownerWhere } from "@/lib/exam-attempt-access";
import { consumeGuestRateLimit, guestRateLimitResponse } from "@/lib/guest-exams";
import { GradingServiceError, gradeAttempt } from "@/lib/grading-service";
import { object } from "@/lib/exam-submission";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

function asyncMode() {
  return String(process.env.GRADING_MODE || "sync").toLowerCase() === "async";
}

async function loadOwnedAttempt(attemptId: string, owner: Awaited<ReturnType<typeof getAttemptOwner>>) {
  if (!owner || owner.kind === "invalid") return null;
  return prisma.examAttempt.findFirst({ where: { id: attemptId, ...ownerWhere(owner), status: "SUBMITTED" }, select: { id: true, grading: true, writingStatus: true, speakingStatus: true } });
}

export async function GET(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const owner = await getAttemptOwner();
  if (!owner || owner.kind === "invalid") return NextResponse.json({ error: "Phiên đăng nhập hoặc phiên học thử đã hết hạn." }, { status: 401 });
  if (owner.kind === "guest") {
    const rate = await consumeGuestRateLimit(request, "attempt-grade-status", 180, owner.guestSessionId);
    if (!rate.allowed) return NextResponse.json({ error: "Bạn thao tác quá nhanh. Hãy thử lại sau ít phút." }, { status: 429, headers: guestRateLimitResponse(rate) });
  }
  const { attemptId } = await params;
  const attempt = await loadOwnedAttempt(attemptId, owner);
  if (!attempt) return NextResponse.json({ error: "Lượt thi chưa nộp hoặc không thuộc tài khoản này." }, { status: 404 });
  const grading = object(attempt.grading);
  const job = await prisma.examGradingJob.findUnique({ where: { attemptId }, select: { id: true, status: true, attempts: true, errorCode: true, errorMessage: true, createdAt: true } });
  const status = grading.complete ? "GRADED" : job?.status || (attempt.writingStatus === "PARTIAL" || attempt.speakingStatus === "PARTIAL" ? "PARTIAL" : "NOT_STARTED");
  const queuedForSeconds = status === "QUEUED" && job ? Math.max(0, Math.floor((Date.now() - job.createdAt.getTime()) / 1000)) : 0;
  const workerUnavailable = status === "QUEUED" && (job?.attempts ?? 0) === 0 && queuedForSeconds >= 30;
  return NextResponse.json({ jobId: job?.id ?? null, status, attempts: job?.attempts ?? 0, queuedForSeconds, workerUnavailable, errorCode: job?.errorCode ?? null, error: job?.errorMessage ?? null, grading }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const owner = await getAttemptOwner();
  if (!owner || owner.kind === "invalid") return NextResponse.json({ error: "Phiên đăng nhập hoặc phiên học thử đã hết hạn." }, { status: 401 });
  if (owner.kind === "guest") {
    const rate = await consumeGuestRateLimit(request, "attempt-grade", 6, owner.guestSessionId);
    if (!rate.allowed) return NextResponse.json({ error: "Bạn thao tác quá nhanh. Hãy thử lại sau ít phút." }, { status: 429, headers: guestRateLimitResponse(rate) });
  }
  const { attemptId } = await params;
  const attempt = await loadOwnedAttempt(attemptId, owner);
  if (!attempt) return NextResponse.json({ error: "Lượt thi chưa nộp hoặc không thuộc tài khoản này." }, { status: 404 });
  const cached = object(attempt.grading);
  if (cached.complete) return NextResponse.json(cached);
  if (!asyncMode() && !process.env.OPENAI_API_KEY) return NextResponse.json({ error: "Dịch vụ chấm điểm chưa được cấu hình. Bài làm vẫn được lưu." }, { status: 503 });

  if (asyncMode()) {
    const existing = await prisma.examGradingJob.findUnique({ where: { attemptId }, select: { id: true, status: true, lockedAt: true, attempts: true } });
    if (existing?.status === "PROCESSING" && existing.lockedAt && existing.lockedAt.getTime() > Date.now() - 15 * 60_000) {
      return NextResponse.json({ jobId: existing.id, status: existing.status, attempts: existing.attempts }, { status: 202, headers: { "Cache-Control": "private, no-store" } });
    }
    const job = existing
      ? await prisma.examGradingJob.update({ where: { id: existing.id }, data: { status: "QUEUED", availableAt: new Date(), lockedAt: null, finishedAt: null, errorCode: null, errorMessage: null }, select: { id: true, status: true, attempts: true } })
      : await prisma.examGradingJob.create({ data: { attemptId, status: "QUEUED" }, select: { id: true, status: true, attempts: true } });
    return NextResponse.json({ jobId: job.id, status: job.status, attempts: job.attempts }, { status: 202, headers: { "Cache-Control": "private, no-store" } });
  }

  try {
    const result = await gradeAttempt(attemptId);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể chấm. Bài làm vẫn được lưu.";
    const status = error instanceof GradingServiceError && error.code === "GRADING_IN_PROGRESS" ? 409 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
