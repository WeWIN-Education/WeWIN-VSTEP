import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DAILY_CHALLENGE_REWARD, dailyChallengeTasks, vietnamDay, type DailyChallengeSummary } from "@/lib/daily-challenge-rules";

async function summary(db: Pick<Prisma.TransactionClient, "vocabularyProgress" | "xpAward" | "dailyChallengeReward">, userId: string, now: Date): Promise<DailyChallengeSummary> {
  const { key, day, start, end } = vietnamDay(now);
  const [words, awards, reward] = await Promise.all([
    db.vocabularyProgress.count({ where: { userId, lastReviewedAt: { gte: start, lt: end } } }),
    db.xpAward.groupBy({ by: ["catalog"], where: { userId, createdAt: { gte: start, lt: end } }, _sum: { amount: true } }),
    db.dailyChallengeReward.findUnique({ where: { userId_day: { userId, day } } }),
  ]);
  return { day: key, resetsAt: end.toISOString(), serverNow: now.toISOString(), claimed: Boolean(reward), reward: DAILY_CHALLENGE_REWARD, tasks: dailyChallengeTasks(words, awards.reduce((sum, award) => sum + (award._sum.amount ?? 0), 0), key, awards.map(award => award.catalog)) };
}
export function getDailyChallenges(userId: string, now = new Date()) { return summary(prisma, userId, now); }

export async function claimDailyChallenge(userId: string, requestedDay: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(async tx => {
        const now = new Date();
        const { day, key } = vietnamDay(now);
        if (requestedDay !== key) return { status: 409, error: "Đã sang ngày mới. Hãy tải lại nhiệm vụ." };
        const state = await summary(tx, userId, now);
        if (state.claimed) return { status: 200, state };
        if (!state.tasks.every(task => task.value >= task.goal)) return { status: 409, error: "Bạn chưa hoàn thành đủ ba nhiệm vụ." };
        await tx.dailyChallengeReward.create({ data: { userId, day, amount: DAILY_CHALLENGE_REWARD } });
        await tx.user.update({ where: { id: userId }, data: { xp: { increment: DAILY_CHALLENGE_REWARD } } });
        return { status: 200, state: { ...state, claimed: true } };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2002"].includes(error.code) && attempt < 2) continue;
      throw error;
    }
  }
  throw new Error("Không thể nhận thưởng lúc này.");
}
