import "server-only";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { reviewSchedule } from "@/lib/vocabulary-study-rules";
import { GrammarError, gradeSet, publicQuestion, validateGrammarContent, type GrammarContent, type GrammarResult } from "./grammar-rules";

const contentOf = (content: Prisma.JsonValue) => content as unknown as GrammarContent;
const json = (value: unknown) => value as Prisma.InputJsonValue;
export const grammarSummary = { id: true, slug: true, version: true, number: true, title: true, summary: true, status: true, reviewedAt: true } as const;

async function requireAdmin(userId: string) {
  const actor = await prisma.user.findFirst({ where: { id: userId, role: "ADMIN", isActive: true }, select: { id: true } });
  if (!actor) throw new GrammarError("Chỉ quản trị viên được thay đổi học liệu.", 403);
}
export async function importGrammar(userId: string, value: unknown) {
  await requireAdmin(userId);
  const content = validateGrammarContent(value);
  const version = createHash("sha256").update(JSON.stringify(content)).digest("hex").slice(0, 20);
  return prisma.grammarLesson.upsert({ where: { slug_version: { slug: content.slug, version } },
    create: { slug: content.slug, version, number: content.number, title: content.title, summary: content.summary, content: json(content), importedById: userId }, update: {}, select: grammarSummary });
}
export async function transitionGrammar(userId: string, lessonId: string, action: string) {
  await requireAdmin(userId);
  return prisma.$transaction(async tx => {
    const item = await tx.grammarLesson.findUnique({ where: { id: lessonId } });
    if (!item) throw new GrammarError("Không tìm thấy bản nội dung.", 404);
    await tx.$queryRaw`SELECT "id" FROM "GrammarLesson" WHERE "slug" = ${item.slug} ORDER BY "id" FOR UPDATE`;
    const current = await tx.grammarLesson.findUniqueOrThrow({ where: { id: lessonId } });
    if (action === "review" && current.status === "DRAFT") {
      validateGrammarContent(current.content);
      return tx.grammarLesson.update({ where: { id: lessonId }, data: { status: "REVIEWED", reviewedAt: new Date(), reviewedById: userId }, select: grammarSummary });
    }
    if (action === "publish" && current.status === "REVIEWED") {
      await tx.grammarLesson.updateMany({ where: { slug: current.slug, status: "PUBLISHED" }, data: { status: "ARCHIVED" } });
      return tx.grammarLesson.update({ where: { id: lessonId }, data: { status: "PUBLISHED" }, select: grammarSummary });
    }
    if (action === "archive" && ["DRAFT", "REVIEWED", "PUBLISHED"].includes(current.status)) return tx.grammarLesson.update({ where: { id: lessonId }, data: { status: "ARCHIVED" }, select: grammarSummary });
    if (action === "restore" && current.status === "ARCHIVED") return tx.grammarLesson.update({ where: { id: lessonId }, data: { status: "DRAFT", reviewedAt: null, reviewedById: null }, select: grammarSummary });
    throw new GrammarError("Trạng thái đã thay đổi. Tải lại danh sách trước khi thực hiện.", 409);
  });
}

export async function getGrammarLesson(slug: string, userId?: string, previewId?: string) {
  if (previewId) {
    if (!userId) throw new GrammarError("Không có quyền xem bản nháp.", 403);
    await requireAdmin(userId);
  }
  const lesson = await prisma.grammarLesson.findFirst({ where: { slug, ...(previewId ? { id: previewId } : { status: "PUBLISHED" }) } });
  if (!lesson) throw new GrammarError("Chuyên đề chưa được công bố.", 404);
  const content = contentOf(lesson.content);
  const progress = userId ? await prisma.grammarSetProgress.findMany({ where: { userId, lessonId: lesson.id } }) : [];
  const sets = content.sets.map(set => ({ id: set.id, title: set.title, required: set.required, count: set.questions.reduce((n, q) => n + (q.blanks?.length ?? 1), 0), progress: progress.find(p => p.setId === set.id) ?? null }));
  return { id: lesson.id, slug, title: lesson.title, summary: lesson.summary, version: lesson.version, status: lesson.status, number: lesson.number, theory: content.theory, source: content.source,
    sets, completed: sets.filter(s => s.required).every(s => Boolean(s.progress?.passedAt)) };
}

export async function getGrammarExercise(lessonId: string, setId: string, userId: string, mode: "TEST" | "REVIEW", preview = false) {
  if (preview) await requireAdmin(userId);
  const lesson = await prisma.grammarLesson.findFirst({ where: { id: lessonId, ...(!preview ? { status: "PUBLISHED" } : {}) } });
  if (!lesson) throw new GrammarError("Nội dung đã thay đổi. Quay lại chuyên đề để mở bài mới.", 409);
  const set = contentOf(lesson.content).sets.find(s => s.id === setId);
  if (!set) throw new GrammarError("Không tìm thấy bài luyện.", 404);
  const due = mode === "REVIEW" ? await prisma.grammarReview.findMany({ where: { userId, lessonId, setId, nextReviewAt: { lte: new Date() } }, orderBy: [{ nextReviewAt: "asc" }, { id: "asc" }], take: 20 }) : [];
  const questions = mode === "REVIEW" ? set.questions.filter(q => due.some(r => r.questionId === q.id)) : set.questions;
  if (!questions.length) throw new GrammarError("Bài này chưa có câu đến hạn ôn.", 409);
  return { lessonId, version: lesson.version, slug: lesson.slug, topicTitle: lesson.title, setId, title: set.title, mode, preview, questions: questions.map(publicQuestion) };
}

export type GrammarSubmission = { submissionId: string; lessonId: string; version: string; setId: string; mode: "TEST" | "REVIEW"; answers: Record<string, unknown> };
export async function previewGrammar(userId: string, input: GrammarSubmission) {
  await requireAdmin(userId);
  const lesson = await prisma.grammarLesson.findUnique({ where: { id: input.lessonId } });
  const set = lesson && lesson.version === input.version ? contentOf(lesson.content).sets.find(s => s.id === input.setId) : null;
  if (!set) throw new GrammarError("Bản xem trước đã thay đổi.", 409);
  return gradeSet(set.questions, input.answers);
}
export async function submitGrammar(userId: string, input: GrammarSubmission): Promise<GrammarResult> {
  return prisma.$transaction(async tx => {
    // The same account lock serializes submissions, preventing duplicate progress and stale review updates.
    const active = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "User" WHERE "id" = ${userId} AND "isActive" = true FOR UPDATE`;
    if (!active.length) throw new GrammarError("Tài khoản không còn hoạt động.", 403);
    const previous = await tx.grammarAttempt.findUnique({ where: { userId_submissionId: { userId, submissionId: input.submissionId } } });
    if (previous) {
      if (previous.lessonId !== input.lessonId || previous.setId !== input.setId || previous.mode !== input.mode || !isDeepStrictEqual(previous.answers, input.answers)) throw new GrammarError("Mã nộp đã được dùng cho nội dung khác. Mở lượt làm mới.", 409);
      return previous.result as unknown as GrammarResult;
    }
    const recent = await tx.grammarAttempt.count({ where: { userId, submittedAt: { gte: new Date(Date.now() - 3600000) } } });
    if (recent >= 100) throw new GrammarError("Bạn đã nộp nhiều lượt liên tiếp. Vui lòng thử lại sau.", 429);
    const lesson = await tx.grammarLesson.findFirst({ where: { id: input.lessonId, version: input.version, status: "PUBLISHED" } });
    if (!lesson) throw new GrammarError("Nội dung đã đổi phiên bản. Giữ câu trả lời và quay lại chuyên đề để mở bài mới.", 409);
    const set = contentOf(lesson.content).sets.find(s => s.id === input.setId);
    if (!set) throw new GrammarError("Bài luyện không thuộc chuyên đề.", 404);
    const now = new Date();
    const reviews = await tx.grammarReview.findMany({ where: { userId, lessonId: lesson.id, setId: set.id } });
    const questions = input.mode === "REVIEW" ? set.questions.filter(q => q.id in input.answers) : set.questions;
    if (!questions.length || (input.mode === "REVIEW" && questions.some(q => !reviews.some(r => r.questionId === q.id && r.nextReviewAt <= now)))) throw new GrammarError("Danh sách ôn đã thay đổi. Mở lại Sổ lỗi sai.", 409);
    const result = gradeSet(questions, input.answers);
    await tx.grammarAttempt.create({ data: { userId, submissionId: input.submissionId, lessonId: lesson.id, setId: set.id, mode: input.mode, answers: json(input.answers), result: json(result) } });
    if (input.mode === "TEST") {
      const where = { userId_lessonId_setId: { userId, lessonId: lesson.id, setId: set.id } };
      const old = await tx.grammarSetProgress.findUnique({ where });
      const bestCorrect = Math.max(old?.bestCorrect ?? 0, result.correct);
      await tx.grammarSetProgress.upsert({ where, create: { userId, lessonId: lesson.id, setId: set.id, bestCorrect, total: result.total, passedAt: result.passed ? now : null },
        update: { bestCorrect, passedAt: old?.passedAt ?? (result.passed ? now : null) } });
    }
    for (const detail of result.details) {
      const old = reviews.find(r => r.questionId === detail.id), correct = detail.correct === detail.total;
      if (correct && !old) continue;
      const schedule = reviewSchedule(correct, old?.intervalStep ?? 0, now);
      await tx.grammarReview.upsert({ where: { userId_lessonId_questionId: { userId, lessonId: lesson.id, questionId: detail.id } },
        create: { userId, lessonId: lesson.id, setId: set.id, questionId: detail.id, ...schedule }, update: { ...schedule, reviewCount: { increment: 1 } } });
    }
    return result;
  }, { maxWait: 5000, timeout: 15000 });
}

export async function grammarReviewList(userId: string) {
  return prisma.grammarReview.findMany({ where: { userId, nextReviewAt: { lte: new Date() }, lesson: { status: "PUBLISHED" } },
    orderBy: [{ nextReviewAt: "asc" }, { id: "asc" }], take: 20, select: { id: true, setId: true, nextReviewAt: true, lesson: { select: { id: true, slug: true, title: true } } } });
}
