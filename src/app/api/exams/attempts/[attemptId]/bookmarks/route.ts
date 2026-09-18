import { getAttemptOwner, ownerWhere } from "@/lib/exam-attempt-access";
import { isSameOrigin } from "@/lib/request-security";
import { prisma } from "@/lib/prisma";
import { resolveCatalogExamData } from "@/lib/exam-scoring";
import { NextResponse } from "next/server";

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "private, no-store" } });
}

async function ownedUserAttempt(attemptId: string) {
  const owner = await getAttemptOwner();
  if (!owner || owner.kind === "invalid") return { response: error("Phiên đăng nhập đã hết hạn.", 401) } as const;
  if (owner.kind !== "user") return { response: error("Bookmark câu hỏi chỉ dành cho tài khoản đăng nhập.", 403) } as const;
  const attempt = await prisma.examAttempt.findFirst({ where: { id: attemptId, ...ownerWhere(owner) }, include: { examPaper: { select: { slug: true, sections: true, questions: true } }, paperPart: { select: { sections: true, questions: true } } } });
  if (!attempt) return { response: error("Không tìm thấy lượt thi.", 404) } as const;
  return { owner, attempt } as const;
}

export async function GET(_request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const result = await ownedUserAttempt(attemptId);
  if ("response" in result) return result.response;
  const bookmarks = await prisma.questionBookmark.findMany({ where: { userId: result.owner.userId, examPaperId: result.attempt.examPaperId, catalog: result.attempt.catalog }, orderBy: { createdAt: "asc" }, select: { questionId: true, note: true, createdAt: true } });
  return NextResponse.json({ bookmarks }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PUT(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  if (!isSameOrigin(request)) return error("Yêu cầu không hợp lệ.", 403);
  const { attemptId } = await params;
  const result = await ownedUserAttempt(attemptId);
  if ("response" in result) return result.response;
  const body = await request.json().catch(() => null) as { questionId?: unknown; note?: unknown } | null;
  const questionId = typeof body?.questionId === "string" ? body.questionId.trim().slice(0, 120) : "";
  if (!questionId) return error("Thiếu mã câu hỏi.", 400);
  const exam = resolveCatalogExamData({ slug: result.attempt.examPaper.slug, sections: result.attempt.examPaper.sections, questions: result.attempt.examPaper.questions, catalog: result.attempt.catalog, partSections: result.attempt.paperPart?.sections, partQuestions: result.attempt.paperPart?.questions });
  if (!exam) return error("Nội dung đề không hợp lệ.", 409);
  const exists = [...exam.paper.listening.parts.flatMap((part) => part.questions), ...exam.paper.reading.passages.flatMap((passage) => passage.questions)].some((question) => question.id === questionId);
  if (!exists) return error("Câu hỏi không thuộc đề này.", 400);
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 500) || null : null;
  const bookmark = await prisma.questionBookmark.upsert({
    where: { userId_examPaperId_catalog_questionId: { userId: result.owner.userId, examPaperId: result.attempt.examPaperId, catalog: result.attempt.catalog, questionId } },
    create: { userId: result.owner.userId, examPaperId: result.attempt.examPaperId, paperPartId: result.attempt.paperPartId, catalog: result.attempt.catalog, questionId, note },
    update: { note },
    select: { questionId: true, note: true, createdAt: true },
  });
  return NextResponse.json({ bookmark }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  if (!isSameOrigin(request)) return error("Yêu cầu không hợp lệ.", 403);
  const { attemptId } = await params;
  const result = await ownedUserAttempt(attemptId);
  if ("response" in result) return result.response;
  const body = await request.json().catch(() => null) as { questionId?: unknown } | null;
  const questionId = typeof body?.questionId === "string" ? body.questionId.trim().slice(0, 120) : "";
  if (!questionId) return error("Thiếu mã câu hỏi.", 400);
  await prisma.questionBookmark.deleteMany({ where: { userId: result.owner.userId, examPaperId: result.attempt.examPaperId, catalog: result.attempt.catalog, questionId } });
  return NextResponse.json({ deleted: true }, { headers: { "Cache-Control": "private, no-store" } });
}
