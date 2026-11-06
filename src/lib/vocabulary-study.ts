import "server-only";
import { Prisma } from "@prisma/client";
import { randomUUID, createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { STUDY_GOALS, reviewSchedule, studyScore, vietnamStudyDay } from "./vocabulary-study-rules";
import { withVocabularyAudio } from "./vocabulary-audio";

const entryFields = { id: true, entryCode: true, term: true, meaningVi: true, ipa: true, partOfSpeech: true, exampleEn: true, exampleVi: true, audioUrl: true, topic: { select: { name: true } } } as const;
type Tx = Prisma.TransactionClient;
export class StudyError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

async function entriesFor(tx: Tx, ids: string[]) {
  const entries = await tx.vocabularyEntry.findMany({ where: { id: { in: ids } }, select: entryFields });
  const byId = new Map(entries.map(entry => [entry.id, withVocabularyAudio(entry)]));
  return ids.flatMap(id => byId.has(id) ? [byId.get(id)!] : []);
}

export async function getStudyDashboard(userId: string) {
  const now = new Date(), { start, end } = vietnamStudyDay(now);
  const [study, due, learnedToday] = await Promise.all([
    prisma.vocabularyStudy.findUnique({ where: { userId } }),
    prisma.vocabularyProgress.count({ where: { userId, status: { not: "NEW" }, nextReviewAt: { lte: now } } }),
    prisma.vocabularyProgress.count({ where: { userId, firstLearnedAt: { gte: start, lt: end } } }),
  ]);
  const entries = study && !study.passedAt ? await entriesFor(prisma, study.entryIds) : [];
  return { goal: study?.goal ?? 10, due, learnedToday, active: study && entries.length ? { version: study.version, isReview: study.isReview, entries } : null };
}

// Serialize start/submit on the same user so parallel tabs cannot unlock extra lessons.
async function locked<T>(userId: string, work: (tx: Tx) => Promise<T>) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
    return work(tx);
  }, { maxWait: 5000, timeout: 20000 });
}

export async function startStudy(userId: string, goal: number) {
  if (!(STUDY_GOALS as readonly number[]).includes(goal)) throw new StudyError("Chọn 5, 10, 15 hoặc 20 từ.");
  return locked(userId, async tx => {
    const current = await tx.vocabularyStudy.findUnique({ where: { userId } });
    if (current && !current.passedAt && current.entryIds.length) {
      const entries = await entriesFor(tx, current.entryIds);
      if (entries.length) return { version: current.version, isReview: current.isReview, entries };
    }
    const due = await tx.vocabularyProgress.findMany({ where: { userId, status: { not: "NEW" }, nextReviewAt: { lte: new Date() } },
      orderBy: [{ nextReviewAt: "asc" }, { id: "asc" }], take: 20, select: { entryId: true } });
    const entries = due.length ? await entriesFor(tx, due.map(row => row.entryId)) : await tx.vocabularyEntry.findMany({
      where: { collection: { kind: "VOCABULARY" }, progress: { none: { userId, status: { in: ["LEARNING", "MASTERED"] } } } },
      orderBy: [{ collection: { code: "asc" } }, { topic: { sortOrder: "asc" } }, { entryCode: "asc" }, { id: "asc" }], take: goal, select: entryFields,
    });
    if (!entries.length) throw new StudyError("Bạn đã học hết kho từ hiện có. Hãy quay lại khi có từ đến hạn ôn.", 409);
    const data = { goal, version: randomUUID(), entryIds: entries.map(entry => entry.id), isReview: due.length > 0, passedAt: null, result: Prisma.DbNull };
    const saved = await tx.vocabularyStudy.upsert({ where: { userId }, create: { userId, ...data }, update: data });
    return { version: saved.version, isReview: saved.isReview, entries: entries.map(withVocabularyAudio) };
  });
}

export async function getStudyQuiz(userId: string, version: string) {
  const session = await prisma.vocabularyStudy.findUnique({ where: { userId } });
  if (!session || session.version !== version || session.passedAt) throw new StudyError("Bài học đã thay đổi. Mở lại Học hôm nay.", 409);
  const entries = await entriesFor(prisma, session.entryIds);
  if (!entries.length) throw new StudyError("Các từ trong bài đã được gỡ. Hãy mở lượt học mới.", 409);
  const extra = await prisma.vocabularyEntry.findMany({ where: { meaningVi: { notIn: entries.map(entry => entry.meaningVi) } }, take: 4, orderBy: { id: "asc" }, select: { meaningVi: true } });
  const meanings = [...new Set([...entries, ...extra].map(entry => entry.meaningVi))];
  return { version, questions: entries.map(entry => {
    const rank = (value: string) => createHash("sha256").update(`${version}:${entry.id}:${value}`).digest("hex");
    const options = [entry.meaningVi, ...meanings.filter(meaning => meaning !== entry.meaningVi).sort((a, b) => rank(a).localeCompare(rank(b))).slice(0, 3)]
      .sort((a, b) => rank(a).localeCompare(rank(b)));
    return { id: entry.id, term: entry.term, options };
  }) };
}

export async function submitStudy(userId: string, version: string, answers: Record<string, string>) {
  return locked(userId, async tx => {
    const session = await tx.vocabularyStudy.findUnique({ where: { userId } });
    if (!session || session.version !== version) throw new StudyError("Bài học đã thay đổi. Mở lại Học hôm nay.", 409);
    if (session.passedAt) return session.result as unknown as ReturnType<typeof studyScore>;
    const entries = await entriesFor(tx, session.entryIds);
    if (!entries.length || entries.some(entry => typeof answers[entry.id] !== "string")) throw new StudyError("Hãy trả lời đủ các câu trước khi nộp.");
    const result = studyScore(entries, answers);
    const now = new Date();
    if (result.passed) {
      const previous = await tx.vocabularyProgress.findMany({ where: { userId, entryId: { in: session.entryIds } } });
      const byId = new Map(previous.map(row => [row.entryId, row]));
      for (const detail of result.details) {
        const old = byId.get(detail.id);
        const data = { status: detail.correct ? "MASTERED" as const : "LEARNING" as const, ...reviewSchedule(detail.correct, old?.intervalStep ?? 0, now), lastReviewedAt: now,
          ...(!session.isReview && !old?.firstLearnedAt ? { firstLearnedAt: now } : {}) };
        await tx.vocabularyProgress.upsert({ where: { userId_entryId: { userId, entryId: detail.id } },
          create: { userId, entryId: detail.id, reviewCount: 1, ...data }, update: { ...data, reviewCount: { increment: 1 } } });
      }
    }
    await tx.vocabularyStudy.update({ where: { userId }, data: { passedAt: result.passed ? now : null, result: result as unknown as Prisma.InputJsonValue } });
    return result;
  });
}
