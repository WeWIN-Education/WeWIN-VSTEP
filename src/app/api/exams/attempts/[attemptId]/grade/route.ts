import { getAttemptOwner, ownerWhere } from "@/lib/exam-attempt-access";
import { consumeGuestRateLimit, guestRateLimitResponse } from "@/lib/guest-exams";
import { object } from "@/lib/exam-submission";
import { resolveCatalogExamData } from "@/lib/exam-scoring";
import { ensureGradingJob, readGradingStatus, type ExpectedGradingPart } from "@/lib/grading-jobs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type OwnedAttempt = {
  id: string;
  grading: unknown;
  writingStatus: string;
  speakingStatus: string;
  updatedAt: Date;
  catalog: "FULL" | "LISTENING" | "READING" | "WRITING" | "SPEAKING";
  examPaper: { slug: string; sections: unknown; questions: unknown };
  paperPart: { sections: unknown; questions: unknown } | null;
};

async function loadOwnedAttempt(attemptId: string, owner: Awaited<ReturnType<typeof getAttemptOwner>>) {
  if (!owner || owner.kind === "invalid") return null;
  return prisma.examAttempt.findFirst({
    where: { id: attemptId, ...ownerWhere(owner), status: "SUBMITTED" },
    select: {
      id: true,
      grading: true,
      writingStatus: true,
      speakingStatus: true,
      updatedAt: true,
      catalog: true,
      examPaper: { select: { slug: true, sections: true, questions: true } },
      paperPart: { select: { sections: true, questions: true } },
    },
  }) as Promise<OwnedAttempt | null>;
}

function expectedParts(attempt: OwnedAttempt): ExpectedGradingPart[] {
  const exam = resolveCatalogExamData({
    slug: attempt.examPaper.slug,
    sections: attempt.examPaper.sections,
    questions: attempt.examPaper.questions,
    catalog: attempt.catalog,
    partSections: attempt.paperPart?.sections,
    partQuestions: attempt.paperPart?.questions,
  });
  if (!exam) return [];
  return [
    ...exam.paper.writing.map((task) => ({ id: task.id, skill: "WRITING" as const })),
    ...exam.paper.speaking.parts.map((part) => ({ id: part.id, skill: "SPEAKING" as const })),
  ];
}

async function statusFor(attempt: OwnedAttempt) {
  return readGradingStatus({
    attemptId: attempt.id,
    grading: attempt.grading,
    writingStatus: attempt.writingStatus,
    speakingStatus: attempt.speakingStatus,
    updatedAt: attempt.updatedAt,
    expectedParts: expectedParts(attempt),
  });
}

function headers() {
  return { "Cache-Control": "private, no-store" };
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
  try {
    const snapshot = await statusFor(attempt);
    // The worker can finish between reading the attempt and reading its job.
    // Refresh the report before telling the browser to stop polling.
    if (["GRADED", "PARTIAL", "FAILED"].includes(snapshot.status)) {
      const latest = await loadOwnedAttempt(attemptId, owner);
      if (latest) return NextResponse.json(await statusFor(latest), { headers: headers() });
    }
    return NextResponse.json(snapshot, { headers: headers() });
  } catch {
    return NextResponse.json({ error: "Không thể đọc tiến độ chấm lúc này." }, { status: 503, headers: headers() });
  }
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

  try {
    const current = await statusFor(attempt);
    if (object(attempt.grading).complete === true) return NextResponse.json(current, { headers: headers() });

    await ensureGradingJob(attemptId);
    const status = await statusFor(attempt);
    const responseStatus = status.status === "FAILED" && !status.retryable
      ? 409
      : status.status === "GRADED" || status.status === "PARTIAL"
        ? 200
        : 202;
    return NextResponse.json(status, { status: responseStatus, headers: headers() });
  } catch {
    return NextResponse.json({ error: "Không thể đưa bài vào hàng đợi chấm lúc này." }, { status: 503, headers: headers() });
  }
}
