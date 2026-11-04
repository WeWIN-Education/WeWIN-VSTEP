import { afterAll, beforeAll, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { prisma } from "../src/lib/prisma";
import { getStudyDashboard, startStudy, getStudyQuiz, submitStudy } from "../src/lib/vocabulary-study";

const enabled = process.env.STUDY_DATABASE_QA === "1" && process.env.DATABASE_URL?.startsWith("postgresql://qa@127.0.0.1:5440/wewin_study_qa");
const run = it.skipIf(!enabled);
const users = ["study-qa-a", "study-qa-b"];
let collectionId = "";
beforeAll(async () => {
  if (!enabled) return;
  for (const id of users) await prisma.user.create({ data: { id, email: `${id}@example.invalid` } });
  const existing = await prisma.vocabularyEntry.findMany({ select: { id: true } });
  await prisma.vocabularyProgress.createMany({ data: users.flatMap(userId => existing.map(entry => ({ userId, entryId: entry.id, status: "MASTERED" as const }))) });
  const collection = await prisma.vocabularyCollection.create({ data: { code: "!STUDY-QA", name: "Study QA", entries: { create: Array.from({ length: 13 }, (_, i) => ({ entryCode: String(i).padStart(2, "0"), level: "B1", term: `Word ${i}`, meaningVi: `Nghĩa ${i}` })) } } });
  collectionId = collection.id;
});
afterAll(async () => {
  if (!enabled) return;
  await prisma.user.deleteMany({ where: { id: { in: users } } });
  await prisma.vocabularyCollection.delete({ where: { id: collectionId } });
  await prisma.$disconnect();
});

run("resumes the same pending lesson across parallel starts and isolates users", async () => {
  const [a, b] = await Promise.all([startStudy(users[0], 5), startStudy(users[0], 5)]);
  expect(a.version).toBe(b.version); expect(a.entries).toHaveLength(5);
  const other = await startStudy(users[1], 5);
  expect(other.version).not.toBe(a.version);
  await expect(getStudyQuiz(users[1], a.version)).rejects.toThrow("Bài học đã thay đổi");
});

run("retains the lesson below 80%, passes at 80%, saves once, then opens the next batch", async () => {
  const session = await startStudy(users[0], 5);
  const answers = Object.fromEntries(session.entries.map((entry, index) => [entry.id, index < 3 ? entry.meaningVi : "wrong"]));
  expect((await submitStudy(users[0], session.version, answers))?.passed).toBe(false);
  expect((await startStudy(users[0], 5)).version).toBe(session.version);
  answers[session.entries[3].id] = session.entries[3].meaningVi;
  const [first, duplicate] = await Promise.all([submitStudy(users[0], session.version, answers), submitStudy(users[0], session.version, answers)]);
  expect(first).toEqual(duplicate); expect(first?.passed).toBe(true);
  const progress = await prisma.vocabularyProgress.findMany({ where: { userId: users[0], entry: { collectionId } } });
  expect(progress).toHaveLength(5); expect(progress.every(row => row.reviewCount === 1 && row.nextReviewAt && row.firstLearnedAt)).toBe(true);
  expect((await getStudyDashboard(users[0])).learnedToday).toBe(5);
  const next = await startStudy(users[0], 5);
  expect(next.version).not.toBe(session.version);
  expect(next.entries.every(row => !session.entries.some(old => old.id === row.id))).toBe(true);
  await expect(submitStudy(users[0], session.version, answers)).rejects.toThrow("Bài học đã thay đổi");
});

run("prioritizes due words and preserves an existing note and review count", async () => {
  const entry = await prisma.vocabularyEntry.findFirstOrThrow({ where: { collectionId } });
  await prisma.vocabularyStudy.update({ where: { userId: users[1] }, data: { passedAt: new Date() } });
  await prisma.vocabularyProgress.create({ data: { userId: users[1], entryId: entry.id, status: "LEARNING", note: "Keep this note", reviewCount: 8, nextReviewAt: new Date(0) } });
  const session = await startStudy(users[1], 10);
  expect(session.isReview).toBe(true); expect(session.entries.map(row => row.id)).toEqual([entry.id]);
  const quiz = await getStudyQuiz(users[1], session.version);
  expect(quiz.questions[0].options).toContain(entry.meaningVi);
  await submitStudy(users[1], session.version, { [entry.id]: entry.meaningVi });
  expect(await prisma.vocabularyProgress.findUnique({ where: { userId_entryId: { userId: users[1], entryId: entry.id } } })).toMatchObject({ note: "Keep this note", reviewCount: 9, intervalStep: 1 });
});
