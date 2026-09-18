import "server-only";

import { prisma } from "@/lib/prisma";
import { Prisma, type ExamCatalog, type ExamSkill, type VstepLevel } from "@prisma/client";

export const VSTEP_LEVELS = ["B1", "B2", "C1"] as const;
export const VSTEP_SKILLS = ["LISTENING", "READING", "WRITING", "SPEAKING"] as const;
export const GAMIFICATION_TIME_ZONE = "Asia/Ho_Chi_Minh";

type VstepSkill = (typeof VSTEP_SKILLS)[number];

export type GamificationSummary = {
  target: VstepLevel;
  xp: number;
  heartsReceived: number;
  streakDays: number;
  progressPercent: number;
  completedSkills: Record<VstepSkill, boolean>;
};

export type LeaderboardEntry = {
  id: string;
  name: string | null;
  xp: number;
  rank: number;
  isCurrentUser: boolean;
};

export type LeaderboardData = {
  entries: LeaderboardEntry[];
  currentUser: LeaderboardEntry | null;
};

const DATE_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: GAMIFICATION_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function dateKey(date: Date) {
  const parts = Object.fromEntries(DATE_PARTS.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function dateFromKey(key: string) {
  return new Date(`${key}T00:00:00.000Z`);
}

function previousDateKey(key: string) {
  const date = dateFromKey(key);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function isPrismaError(error: unknown, code: string) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

function normalizeLevel(value: string): VstepLevel | null {
  return VSTEP_LEVELS.includes(value as (typeof VSTEP_LEVELS)[number]) ? value as VstepLevel : null;
}

function skillForCatalog(catalog: ExamCatalog, skill: ExamSkill | null): VstepSkill | null {
  if (skill && VSTEP_SKILLS.includes(skill)) return skill;
  if (catalog === "LISTENING" || catalog === "READING" || catalog === "WRITING" || catalog === "SPEAKING") return catalog;
  return null;
}

function emptySkills(): Record<VstepSkill, boolean> {
  return { LISTENING: false, READING: false, WRITING: false, SPEAKING: false };
}

async function recordDailyVisit(userId: string) {
  const today = dateKey(new Date());
  const yesterday = previousDateKey(today);

  for (let retry = 0; retry < 3; retry += 1) {
    try {
      return await prisma.$transaction(async (transaction) => {
        const user = await transaction.user.findUnique({
          where: { id: userId },
          select: { streakDays: true, lastActiveDate: true },
        });
        if (!user) return null;

        await transaction.dailyActivity.upsert({
          where: { userId_activityDate: { userId, activityDate: dateFromKey(today) } },
          create: { userId, activityDate: dateFromKey(today) },
          update: {},
        });

        const lastDate = user.lastActiveDate ? dateKey(user.lastActiveDate) : null;
        if (lastDate === today) return user.streakDays;

        const streakDays = lastDate === yesterday ? Math.max(1, user.streakDays) + 1 : 1;
        await transaction.user.update({
          where: { id: userId },
          data: { streakDays, lastActiveDate: dateFromKey(today) },
        });
        return streakDays;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (isPrismaError(error, "P2034") && retry < 2) continue;
      throw error;
    }
  }

  return null;
}

async function completedSkills(userId: string, target: VstepLevel) {
  const attempts = await prisma.examAttempt.findMany({
    where: {
      userId,
      status: "SUBMITTED",
      examPaper: {
        programme: "VSTEP",
        OR: [
          { target: { contains: target, mode: "insensitive" } },
          { target: { equals: "B1-C1", mode: "insensitive" } },
        ],
      },
    },
    select: { catalog: true, skill: true },
  });

  const completed = emptySkills();
  for (const attempt of attempts) {
    if (attempt.catalog === "FULL") {
      for (const skill of VSTEP_SKILLS) completed[skill] = true;
      continue;
    }
    const skill = skillForCatalog(attempt.catalog, attempt.skill);
    if (skill) completed[skill] = true;
  }
  return completed;
}

export async function getGamificationSummary(userId: string): Promise<GamificationSummary> {
  await recordDailyVisit(userId);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { vstepTarget: true, xp: true, heartsReceived: true, streakDays: true },
  });
  if (!user) throw new Error("Không tìm thấy tài khoản.");

  const completed = await completedSkills(userId, user.vstepTarget);
  const completedCount = VSTEP_SKILLS.filter((skill) => completed[skill]).length;

  return {
    target: user.vstepTarget,
    xp: user.xp,
    heartsReceived: user.heartsReceived,
    streakDays: user.streakDays,
    progressPercent: completedCount * 25,
    completedSkills: completed,
  };
}

function rankEntries(users: Array<{ id: string; name: string | null; xp: number }>, currentUserId?: string): LeaderboardEntry[] {
  let rank = 0;
  let previousXp: number | null = null;
  return users.map((user, index) => {
    if (previousXp !== user.xp) rank = index + 1;
    previousXp = user.xp;
    return { ...user, rank, isCurrentUser: user.id === currentUserId };
  });
}

export async function getLeaderboard(currentUserId?: string): Promise<LeaderboardData> {
  const users = await prisma.user.findMany({
    where: { role: "LEARNER", isActive: true },
    orderBy: [{ xp: "desc" }, { createdAt: "asc" }, { id: "asc" }],
    select: { id: true, name: true, xp: true },
  });
  const ranked = rankEntries(users, currentUserId);
  const currentUser = currentUserId ? ranked.find((entry) => entry.id === currentUserId) || null : null;
  const topTen = ranked.slice(0, 10);
  const entries = currentUser && !topTen.some((entry) => entry.id === currentUser.id) ? [...topTen, currentUser] : topTen;
  return { entries, currentUser };
}

function scoreBonusFor(catalog: ExamCatalog, listeningScore: number | null, readingScore: number | null) {
  const scores = catalog === "LISTENING"
    ? [listeningScore]
    : catalog === "READING"
      ? [readingScore]
      : catalog === "FULL"
        ? [listeningScore, readingScore]
        : [];
  const validScores = scores.filter((score): score is number => typeof score === "number" && Number.isFinite(score));
  if (!validScores.length) return 0;
  const average = validScores.reduce((total, score) => total + score, 0) / validScores.length;
  return Math.max(0, Math.min(50, Math.round(Math.max(0, Math.min(10, average)) * 5)));
}

export async function awardXpForAttempt(attemptId: string, userId: string) {
  for (let retry = 0; retry < 3; retry += 1) {
    try {
      return await prisma.$transaction(async (transaction) => {
        const existing = await transaction.xpAward.findUnique({ where: { attemptId } });
        if (existing) return { amount: existing.amount, baseXp: existing.baseXp, scoreBonus: existing.scoreBonus };

        const attempt = await transaction.examAttempt.findFirst({
          where: { id: attemptId, userId, status: "SUBMITTED" },
          select: { catalog: true, listeningScore: true, readingScore: true },
        });
        if (!attempt) return null;

        const baseXp = attempt.catalog === "FULL" ? 100 : 25;
        const scoreBonus = scoreBonusFor(attempt.catalog, attempt.listeningScore, attempt.readingScore);
        const amount = baseXp + scoreBonus;
        await transaction.xpAward.create({
          data: { userId, attemptId, amount, baseXp, scoreBonus, catalog: attempt.catalog },
        });
        await transaction.user.update({ where: { id: userId }, data: { xp: { increment: amount } } });
        return { amount, baseXp, scoreBonus };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (isPrismaError(error, "P2034") && retry < 2) continue;
      if (isPrismaError(error, "P2002")) {
        const existing = await prisma.xpAward.findUnique({ where: { attemptId }, select: { amount: true, baseXp: true, scoreBonus: true } });
        if (existing) return existing;
      }
      throw error;
    }
  }

  return null;
}

export function parseVstepTarget(value: unknown): VstepLevel | null {
  return typeof value === "string" ? normalizeLevel(value.toUpperCase()) : null;
}
