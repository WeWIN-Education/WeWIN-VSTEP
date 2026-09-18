import { getAuthState } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { consumeGuestRateLimit, ensureGuestSession, guestRateLimitResponse } from "@/lib/guest-exams";
import { getExamPaperForAccess } from "@/lib/exam-server";
import { Prisma, type ExamCatalog, type ExamPaper, type ExamSkill } from "@prisma/client";
import { NextResponse } from "next/server";

type StartBody = { program?: string; slug?: string; catalog?: string };

const CATALOGS = ["FULL", "LISTENING", "READING", "WRITING", "SPEAKING"] as const;
type CatalogCode = (typeof CATALOGS)[number];

function catalogValue(value: unknown): CatalogCode {
  const normalized = String(value || "FULL").toUpperCase();
  return (CATALOGS as readonly string[]).includes(normalized) ? normalized as CatalogCode : "FULL";
}

function isConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function noStore<T>(body: T, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: { "Cache-Control": "private, no-store", ...(init?.headers || {}) },
  });
}

function startResponse(attempt: { id: string; expiresAt: Date | null }) {
  return noStore({ id: attempt.id, attemptId: attempt.id, expiresAt: attempt.expiresAt?.toISOString() });
}

async function createAttempt(paper: ExamPaper, input: { userId?: string; guestSessionId?: string; catalog: CatalogCode; paperPartId?: string; skill?: ExamSkill | null; durationMin?: number }) {
  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + (input.durationMin ?? paper.durationMin) * 60_000);
  return prisma.examAttempt.create({
    data: {
      userId: input.userId,
      guestSessionId: input.guestSessionId,
      catalog: input.catalog as ExamCatalog,
      skill: input.skill,
      paperPartId: input.paperPartId,
      examPaperId: paper.id,
      status: "IN_PROGRESS",
      startedAt,
      expiresAt,
      answers: {},
      recordings: {},
    },
    select: { id: true, expiresAt: true },
  });
}

export async function POST(request: Request) {
  let body: StartBody;
  try {
    body = (await request.json()) as StartBody;
  } catch {
    return noStore({ error: "Dữ liệu bắt đầu lượt thi không hợp lệ." }, { status: 400 });
  }

  const program = body.program?.toLowerCase();
  const slug = body.slug?.trim();
  if (!slug || program !== "vstep") {
    return noStore({ error: "Đề thi không hợp lệ." }, { status: 400 });
  }
  const catalog = catalogValue(body.catalog);

  const authState = await getAuthState();
  if (authState.kind === "invalid") return noStore({ error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." }, { status: 401 });
  if (authState.kind === "authenticated") {
    const user = authState.user;
    const access = user.role === "ADMIN" ? { kind: "admin" as const, userId: user.id } : { kind: "learner" as const, userId: user.id };
    const paper = await getExamPaperForAccess(program, slug, access);
    if (!paper) return noStore({ error: "Đề thi chưa được mở cho tài khoản này." }, { status: 404 });
    const part = catalog === "FULL" ? null : await prisma.examPaperPart.findUnique({ where: { examPaperId_catalog: { examPaperId: paper.id, catalog: catalog as ExamCatalog } }, select: { id: true, skill: true, durationMin: true } });
    if (catalog !== "FULL" && !part) return noStore({ error: "Kho kỹ năng của đề này chưa sẵn sàng." }, { status: 409 });

    const existing = await prisma.examAttempt.findFirst({
      where: { userId: user.id, examPaperId: paper.id, catalog: catalog as ExamCatalog, status: "IN_PROGRESS" },
      orderBy: { updatedAt: "desc" },
      select: { id: true, expiresAt: true },
    });
    if (existing) return startResponse(existing);

    try {
      return startResponse(await createAttempt(paper, { userId: user.id, catalog, paperPartId: part?.id, skill: part?.skill, durationMin: part?.durationMin ?? paper.durationMin }));
    } catch (error) {
      return noStore({ error: isConflict(error) ? "Lượt thi vừa được tạo. Hãy thử lại." : "Không thể bắt đầu lượt thi." }, { status: 409 });
    }
  }

  const paper = await getExamPaperForAccess(program, slug, { kind: "guest" });
  if (!paper) return noStore({ error: "Bài học thử chưa sẵn sàng." }, { status: 404 });
  const rate = await consumeGuestRateLimit(request, "attempt-start");
  if (!rate.allowed) return noStore({ error: "Bạn thao tác quá nhanh. Hãy thử lại sau ít phút." }, { status: 429, headers: guestRateLimitResponse(rate) });

  const guest = await ensureGuestSession();

  const part = catalog === "FULL" ? null : await prisma.examPaperPart.findUnique({ where: { examPaperId_catalog: { examPaperId: paper.id, catalog: catalog as ExamCatalog } }, select: { id: true, skill: true, durationMin: true } });
  if (catalog !== "FULL" && !part) return noStore({ error: "Kho kỹ năng của đề này chưa sẵn sàng." }, { status: 409 });

  for (let retry = 0; retry < 3; retry += 1) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const existingUse = await tx.guestAttemptUse.findUnique({
          where: { guestSessionId_catalog_examPaperId: { guestSessionId: guest.id, catalog: catalog as ExamCatalog, examPaperId: paper.id } },
          select: { attempt: { select: { id: true, expiresAt: true } } },
        });
        if (existingUse?.attempt) return { kind: "existing" as const, attempt: existingUse.attempt };
        const usedCount = await tx.guestAttemptUse.count({ where: { guestSessionId: guest.id, catalog: catalog as ExamCatalog } });
        if (usedCount >= 2) return { kind: "quota" as const };

        const use = await tx.guestAttemptUse.create({ data: { guestSessionId: guest.id, examPaperId: paper.id, catalog: catalog as ExamCatalog } });
        const startedAt = new Date();
        const attempt = await tx.examAttempt.create({
          data: {
            guestSessionId: guest.id,
            catalog: catalog as ExamCatalog,
            skill: part?.skill,
            paperPartId: part?.id,
            examPaperId: paper.id,
            status: "IN_PROGRESS",
            startedAt,
            expiresAt: new Date(startedAt.getTime() + (part?.durationMin || paper.durationMin) * 60_000),
            answers: {},
            recordings: {},
          },
          select: { id: true, expiresAt: true },
        });
        await tx.guestAttemptUse.update({ where: { id: use.id }, data: { attemptId: attempt.id } });
        return { kind: "created" as const, attempt };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      if (result.kind === "quota") return noStore({ error: "Bạn đã dùng đủ 2 đề khác nhau trong kho này.", code: "GUEST_QUOTA_EXHAUSTED" }, { status: 403 });
      return startResponse(result.attempt);
    } catch (error) {
      const serializationConflict = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
      if (serializationConflict && retry < 2) continue;
      if (isConflict(error)) {
        const raced = await prisma.guestAttemptUse.findUnique({
          where: { guestSessionId_catalog_examPaperId: { guestSessionId: guest.id, catalog: catalog as ExamCatalog, examPaperId: paper.id } },
          select: { attempt: { select: { id: true, expiresAt: true } } },
        });
        if (raced?.attempt) return startResponse(raced.attempt);
      }
      return noStore({ error: "Không thể bắt đầu bài học thử." }, { status: 409 });
    }
  }
  return noStore({ error: "Không thể bắt đầu bài học thử." }, { status: 409 });
}
