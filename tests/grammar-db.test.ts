import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
vi.mock("server-only", () => ({}));
import { prisma } from "../src/lib/prisma";
import { importGrammar, transitionGrammar, getGrammarLesson, getGrammarExercise, grammarReviewList, previewGrammar, submitGrammar } from "../src/lib/grammar";
import { validateGrammarContent, type GrammarQuestion } from "../src/lib/grammar-rules";
import pilot from "../src/data/grammar-pilot.json";

const enabled = process.env.GRAMMAR_DATABASE_QA === "1" && process.env.DATABASE_URL?.includes("@127.0.0.1:5441/wewin_grammar_utf8_qa");
const run = it.skipIf(!enabled), prefix = `grammar-test-${randomUUID()}`;
const admin = `${prefix}-admin`, a = `${prefix}-a`, b = `${prefix}-b`, teacher = `${prefix}-teacher`;
const content = validateGrammarContent({ ...pilot[0], slug: `${prefix}-nouns` });
let lessonId = "", version = "";
const answersFor = (questions: GrammarQuestion[]) => Object.fromEntries(questions.map(q => [q.id, q.correctOption ?? (q.type === "WORD_ORDER" ? { tokenIds: ["t2", "t4", "t3", "t1"] } : q.type === "ERROR_CORRECTION" ? { indexes: q.errorIndexes, correction: q.accepted![0] } : q.accepted![0])]));
const submission = (setId: string, answers: Record<string, unknown>, mode: "TEST" | "REVIEW" = "TEST") => ({ submissionId: randomUUID(), lessonId, version, setId, mode, answers });
beforeAll(async () => {
  if (!enabled) return;
  for (const id of [admin, a, b, teacher]) await prisma.user.create({ data: { id, email: `${id}@example.invalid`, role: id === admin ? "ADMIN" : id === teacher ? "TEACHER" : "LEARNER" } });
  const lesson = await importGrammar(admin, content); lessonId = lesson.id; version = lesson.version;
});
afterAll(async () => {
  if (!enabled) return;
  await prisma.user.deleteMany({ where: { id: { in: [admin, a, b, teacher] } } });
  await prisma.grammarLesson.deleteMany({ where: { slug: content.slug } });
  await prisma.$disconnect();
});
run("imports idempotently, checks roles and requires review before publication", async () => {
  expect((await importGrammar(admin, content)).id).toBe(lessonId);
  await expect(importGrammar(teacher, content)).rejects.toThrow("quản trị viên");
  await expect(transitionGrammar(admin, lessonId, "publish")).rejects.toThrow("Trạng thái");
  await expect(getGrammarLesson(content.slug, a)).rejects.toThrow("chưa được công bố");
  await expect(getGrammarLesson(content.slug, a, lessonId)).rejects.toThrow("quản trị viên");
  const preview = await previewGrammar(admin, submission(content.sets[0].id, answersFor(content.sets[0].questions)));
  expect(preview.passed).toBe(true);
  expect(await prisma.grammarAttempt.count({ where: { lessonId } })).toBe(0);
  await transitionGrammar(admin, lessonId, "review"); await transitionGrammar(admin, lessonId, "publish");
});
run("saves once across parallel duplicate submissions and never masters a topic from a single set", async () => {
  const input = submission(content.sets[1].id, answersFor(content.sets[1].questions));
  const [first, second] = await Promise.all([submitGrammar(a, input), submitGrammar(a, { ...input, answers: Object.fromEntries(Object.entries(input.answers).reverse()) })]);
  expect(first).toEqual(second); expect(first.passed).toBe(true);
  expect(await prisma.grammarAttempt.count({ where: { lessonId, userId: a } })).toBe(1);
  expect((await getGrammarLesson(content.slug, a)).completed).toBe(false);
  expect((await getGrammarLesson(content.slug, b)).sets.every(s => s.progress === null)).toBe(true);
  await expect(submitGrammar(a, { ...input, answers: { ...input.answers, "noun-6": "o1" } })).rejects.toThrow("Mã nộp");
});
run("keeps failed set separate and reviews due mistakes without changing test mastery", async () => {
  const set = content.sets[0], answers = answersFor(set.questions);
  answers[set.questions[3].id] = "wrong"; answers[set.questions[4].id] = "wrong";
  expect((await submitGrammar(a, submission(set.id, answers))).passed).toBe(false);
  expect((await getGrammarLesson(content.slug, a)).completed).toBe(false);
  expect(await grammarReviewList(a)).toHaveLength(0);
  await prisma.grammarReview.updateMany({ where: { userId: a, lessonId }, data: { nextReviewAt: new Date(0) } });
  const exercise = await getGrammarExercise(lessonId, set.id, a, "REVIEW");
  expect(exercise.questions).toHaveLength(2);
  expect(JSON.stringify(exercise)).not.toContain('"accepted"');
  const reviewAnswers = Object.fromEntries(set.questions.filter(q => exercise.questions.some(p => p.id === q.id)).map(q => [q.id, q.accepted![0]]));
  const input = submission(set.id, reviewAnswers, "REVIEW");
  await expect(submitGrammar(b, input)).rejects.toThrow("Danh sách ôn");
  await submitGrammar(a, input); await submitGrammar(a, input);
  expect((await getGrammarLesson(content.slug, a)).completed).toBe(false);
  const reviews = await prisma.grammarReview.findMany({ where: { userId: a, lessonId } });
  expect(reviews.every(r => r.reviewCount === 2 && r.intervalStep === 1)).toBe(true);
  await prisma.grammarReview.updateMany({ where: { userId: a, lessonId }, data: { nextReviewAt: new Date(0) } });
  expect(await grammarReviewList(a)).toHaveLength(2);
  const allCorrect = answersFor(set.questions); allCorrect[set.questions[4].id] = "wrong";
  expect((await submitGrammar(a, submission(set.id, allCorrect))).passed).toBe(true);
  expect((await getGrammarLesson(content.slug, a)).completed).toBe(true);
});
run("rolls back the attempt and progress if saving a review fails mid-transaction", async () => {
  // Local QA only. This constraint targets this run's disposable learner, not other data.
  const constraint = `grammar_rollback_${randomUUID().replaceAll("-", "")}`;
  await prisma.$executeRawUnsafe(`ALTER TABLE "GrammarReview" ADD CONSTRAINT "${constraint}" CHECK ("userId" <> '${b}')`);
  try {
    const set = content.sets[0], answers = answersFor(set.questions);
    answers[set.questions[0].id] = "wrong";
    await expect(submitGrammar(b, submission(set.id, answers))).rejects.toThrow();
    expect(await prisma.grammarAttempt.count({ where: { userId: b } })).toBe(0);
    expect(await prisma.grammarSetProgress.count({ where: { userId: b } })).toBe(0);
    expect(await prisma.grammarReview.count({ where: { userId: b } })).toBe(0);
  } finally {
    await prisma.$executeRawUnsafe(`ALTER TABLE "GrammarReview" DROP CONSTRAINT "${constraint}"`);
  }
});
run("rejects locked accounts, unrelated answers and obsolete content without partial writes", async () => {
  const input = submission(content.sets[0].id, answersFor(content.sets[0].questions));
  await prisma.user.update({ where: { id: b }, data: { isActive: false } });
  await expect(submitGrammar(b, input)).rejects.toThrow("không còn hoạt động");
  await expect(submitGrammar(a, { ...input, answers: { foreign: "answer" } })).rejects.toThrow("không khớp");
  expect(await prisma.grammarAttempt.count({ where: { submissionId: input.submissionId } })).toBe(0);
  const next = await importGrammar(admin, { ...content, title: "Nouns revised" });
  await transitionGrammar(admin, next.id, "review"); await transitionGrammar(admin, next.id, "publish");
  expect(await prisma.grammarLesson.count({ where: { slug: content.slug, status: "PUBLISHED" } })).toBe(1);
  await expect(submitGrammar(a, input)).rejects.toThrow("đổi phiên bản");
  expect((await getGrammarLesson(content.slug, a)).completed).toBe(false);
  expect(await prisma.grammarSetProgress.count({ where: { lessonId, userId: a } })).toBe(2);
  await transitionGrammar(admin, lessonId, "restore");
  expect((await prisma.grammarLesson.findUniqueOrThrow({ where: { id: lessonId } })).status).toBe("DRAFT");
  await expect(transitionGrammar(admin, lessonId, "publish")).rejects.toThrow("Trạng thái");
});
