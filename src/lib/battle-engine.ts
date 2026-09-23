import "server-only";
import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordBaseline } from "@/lib/performance-baseline";
import { ANSWER_MS, RESULT_MS, QUEUE_MS, DISCONNECT_MS, battleDay, battlePoints, battleRank, battleTurnStarts, botDecision, selectBattleQuestions, type BattleQuestionInput } from "./battle-rules";
import { BATTLE_BOT_NAMES } from "./battle-bot-names";

type Tx = Prisma.TransactionClient;
const includeMatch = { players: { orderBy: { slot: "asc" as const }, include: { reward: true } }, turns: { orderBy: { number: "asc" as const }, include: { answer: true } } };
type Match = Prisma.BattleMatchGetPayload<{ include: typeof includeMatch }>;
export class BattleError extends Error { constructor(message: string, public status = 409) { super(message); } }
export type BattleCommand = { action: "state" | "join" | "cancel" | "answer" | "leave"; matchId?: string; turn?: number; choice?: number; heartbeat?: boolean };
const random = () => randomInt(0, 0x100000000) / 0x100000000;
export const BATTLE_LOCK = 9232601;

async function loadMatch(tx: Tx, id: string) {
  const match = await tx.battleMatch.findUnique({ where: { id }, include: includeMatch });
  if (!match) throw new BattleError("Không tìm thấy trận đấu.", 404);
  return match;
}

async function finish(tx: Tx, match: Match, now: Date, reason: string, winnerSlot: number | null) {
  const status = reason === "BOTH_OFFLINE" ? "CANCELLED" : "FINISHED";
  await tx.battleMatch.update({ where: { id: match.id }, data: { status, reason, winnerSlot, finishedAt: now } });
  const day = battleDay(now);
  for (const player of match.players) {
    if (!player.userId || player.isBot) continue;
    const eligible = status !== "CANCELLED" && (reason === "COMPLETE" || (winnerSlot === player.slot && player.answered >= 3));
    const count = await tx.battleReward.count({ where: { userId: player.userId, day, xp: { gt: 0 } } });
    const xp = eligible && count < 5 ? winnerSlot === null ? 25 : winnerSlot === player.slot ? 60 : 10 : 0;
    await tx.battleReward.create({ data: { playerId: player.id, userId: player.userId, day, xp, createdAt: now } });
    if (xp) await tx.user.update({ where: { id: player.userId }, data: { xp: { increment: xp } } });
  }
  await tx.battleSession.updateMany({ where: { matchId: match.id }, data: { matchId: null, queuedAt: null } });
  return loadMatch(tx, match.id);
}

async function recordAnswer(tx: Tx, match: Match, turn: Match["turns"][number], choice: number | null, at: Date, start: number) {
  const player = match.players[turn.slot];
  const elapsed = at.getTime() - start;
  const points = choice === turn.correct ? battlePoints(elapsed) : 0;
  turn.answer = await tx.battleAnswer.create({ data: { turnId: turn.id, userId: player.userId, choice, points, createdAt: at } });
  await tx.battlePlayer.update({ where: { id: player.id }, data: { score: { increment: points }, correct: { increment: points > 0 ? 1 : 0 }, answered: { increment: choice === null ? 0 : 1 } } });
}

async function advance(tx: Tx, match: Match, now: Date) {
  if (match.status !== "ACTIVE") return match;
  const offline = match.players.filter(p => !p.isBot && (!p.userId || now.getTime() - p.lastSeenAt.getTime() > DISCONNECT_MS));
  // Resolve the earlier event (disconnect or normal finish), even after a long idle period.
  const disconnectAt = offline.length ? Math.min(...offline.map(p => p.lastSeenAt.getTime() + DISCONNECT_MS)) : Infinity;
  const until = Math.min(now.getTime(), disconnectAt);
  let start = match.startsAt.getTime();
  for (const turn of match.turns) {
    if (!turn.answer) {
      if (turn.botDelay !== null && start + turn.botDelay <= until) {
        await recordAnswer(tx, match, turn, turn.botChoice, new Date(start + turn.botDelay), start);
      } else if (start + ANSWER_MS <= until) {
        await recordAnswer(tx, match, turn, null, new Date(start + ANSWER_MS), start);
      }
    }
    start = (turn.answer?.createdAt.getTime() ?? start + ANSWER_MS) + RESULT_MS;
  }
  const end = start;
  const updated = await loadMatch(tx, match.id);
  if (disconnectAt < end && disconnectAt < now.getTime()) {
    return finish(tx, updated, new Date(disconnectAt), offline.length === 2 ? "BOTH_OFFLINE" : "DISCONNECTED", offline.length === 2 ? null : 1 - offline[0].slot);
  }
  if (now.getTime() >= end) {
    const [a, b] = updated.players;
    return finish(tx, updated, new Date(end), "COMPLETE", a.score === b.score ? null : a.score > b.score ? 0 : 1);
  }
  return updated;
}

async function createMatch(tx: Tx, userId: string, otherId: string | null, now: Date) {
  const users = await tx.user.findMany({ where: { id: { in: otherId ? [userId, otherId] : [userId] }, isActive: true }, select: { id: true, name: true, xp: true } });
  if (users.length !== (otherId ? 2 : 1)) throw new BattleError("Tài khoản không còn hoạt động.", 403);
  const pool = await tx.battleQuestion.findMany({ where: { published: true } });
  const questions = selectBattleQuestions(pool as BattleQuestionInput[], random);
  const human = users.find(u => u.id === userId)!;
  const opponent = otherId ? users.find(u => u.id === otherId)! : null;
  const sides = random() < 0.5 ? [human, opponent] : [opponent, human];
  const botNames = BATTLE_BOT_NAMES.filter(name => name !== human.name?.trim());
  const botName = botNames[randomInt(botNames.length)];
  const match = await tx.battleMatch.create({ data: {
    startsAt: new Date(now.getTime() + 3000),
    players: { create: sides.map((u, slot) => ({ userId: u?.id, slot, isBot: !u, name: u?.name?.trim() || (u ? "Học viên WEWIN" : botName), rank: battleRank(u?.xp ?? human.xp), lastSeenAt: now })) },
    turns: { create: questions.map((q, number) => {
      const bot = !sides[number % 2] ? botDecision(q.correct, random) : null;
      return { number, slot: number % 2, type: q.type, difficulty: q.difficulty, prompt: q.prompt, options: q.options, correct: q.correct, explanation: q.explanation, botChoice: bot?.choice, botDelay: bot?.delay };
    }) },
  } });
  await tx.battleSession.updateMany({ where: { userId: { in: users.map(u => u.id) } }, data: { matchId: match.id, queuedAt: null } });
  return loadMatch(tx, match.id);
}

export function publicBattle(match: Match, userId: string, now: Date, updatedXp: number | null = null) {
  const me = match.players.find(p => p.userId === userId);
  if (!me) throw new BattleError("Bạn không tham gia trận này.", 403);
  const starts = battleTurnStarts(match.startsAt, match.turns);
  const index = Math.max(0, starts.findLastIndex(start => start <= now.getTime()));
  const current = match.turns[index];
  const reveal = (t: Match["turns"][number]) => match.status !== "ACTIVE" || Boolean(t.answer);
  const project = (t: Match["turns"][number]) => ({ number: t.number, slot: t.slot, type: t.type, prompt: t.prompt, options: t.options,
    ...(reveal(t) ? { correct: t.correct, explanation: t.explanation, choice: t.answer?.choice ?? null, points: t.answer?.points ?? 0 } : {}),
    answered: Boolean(t.answer), deadline: starts[t.number] + ANSWER_MS,
    nextAt: (t.answer?.createdAt.getTime() ?? starts[t.number] + ANSWER_MS) + RESULT_MS });
  return { kind: "match" as const, id: match.id, status: match.status, reason: match.reason, winnerSlot: match.winnerSlot, startsAt: match.startsAt.getTime(), serverNow: now.getTime(), mySlot: me.slot, updatedXp,
    players: match.players.map(p => ({ slot: p.slot, name: p.userId || p.isBot ? p.name : "Người dùng đã xóa", rank: p.rank, score: p.score, correct: p.correct, xp: p.reward?.xp ?? 0 })),
    current: now.getTime() < match.startsAt.getTime() ? null : project(current),
    review: match.status !== "ACTIVE" ? match.turns.map(project) : [],
  };
}
export type BattleView = ReturnType<typeof publicBattle>;

export async function battleCommand(user: { id: string; sessionVersion: number }, command: BattleCommand, clock: () => Date = () => new Date()) {
  return prisma.$transaction(async tx => {
    // ponytail: one transaction lock for <=20 concurrent players; partition by queue/match only if measured contention warrants it.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${BATTLE_LOCK})`;
    const now = clock();
    const live = await tx.user.findUnique({ where: { id: user.id }, select: { isActive: true, sessionVersion: true, xp: true } });
    if (!live?.isActive || live.sessionVersion !== user.sessionVersion) throw new BattleError("Vui lòng đăng nhập lại.", 401);
    let session = await tx.battleSession.upsert({ where: { userId: user.id }, create: { userId: user.id, lastSeenAt: now, windowAt: now }, update: {} });
    const reset = now.getTime() - session.windowAt.getTime() >= 10_000;
    if (!reset && session.requests >= 40) throw new BattleError("Thao tác quá nhanh. Vui lòng chờ vài giây.", 429);
    session = await tx.battleSession.update({ where: { userId: user.id }, data: { windowAt: reset ? now : session.windowAt, requests: reset ? 1 : session.requests + 1 } });
    try {
    const matchId = command.matchId ?? session.matchId;
    if (matchId) {
      let match = await loadMatch(tx, matchId);
      const player = match.players.find(p => p.userId === user.id);
      if (!player) throw new BattleError("Bạn không tham gia trận này.", 403);
      match = await advance(tx, match, now);
      if (match.status === "ACTIVE") {
        if (command.heartbeat || command.action === "answer") {
          await tx.battlePlayer.update({ where: { id: player.id }, data: { lastSeenAt: now } });
        }
        if (command.action === "leave") match = await finish(tx, match, now, "FORFEIT", 1 - player.slot);
        if (command.action === "answer") {
          const turn = match.turns[command.turn ?? -1];
          const start = battleTurnStarts(match.startsAt, match.turns)[command.turn ?? -1];
          const elapsed = now.getTime() - start;
          if (!turn || turn.slot !== player.slot) throw new BattleError("Không phải lượt của bạn.");
          if (turn.answer) {
            if (turn.answer.choice !== command.choice) throw new BattleError("Đáp án đã được ghi nhận, không thể sửa.");
          } else {
            if (elapsed < 0 || elapsed >= ANSWER_MS) throw new BattleError("Lượt này chưa bắt đầu hoặc đã hết giờ.");
            await recordAnswer(tx, match, turn, command.choice!, now, start);
            match = await loadMatch(tx, match.id);
          }
        }
      }
      const profile = match.status !== "ACTIVE" ? await tx.user.findUnique({ where: { id: user.id }, select: { xp: true } }) : null;
      return publicBattle(match, user.id, now, profile?.xp ?? null);
    }
    if (command.action === "answer" || command.action === "leave") throw new BattleError("Không có trận đang chơi.");
    if (command.action === "cancel") {
      await tx.battleSession.update({ where: { userId: user.id }, data: { queuedAt: null } });
      return { kind: "idle" as const, xp: live.xp, serverNow: now.getTime() };
    }
    if (command.action === "join") {
      if (process.env.QUICK_BATTLE_ENABLED !== "true") throw new BattleError("Quick Battle đang được chuẩn bị. Vui lòng quay lại sau.", 503);
      const counts = await tx.battleQuestion.groupBy({ by: ["type"], where: { published: true }, _count: true });
      if (["VOCABULARY", "GRAMMAR", "PHRASES"].some(type => (counts.find(c => c.type === type)?._count ?? 0) < 10)) throw new BattleError("Ngân hàng câu hỏi đang được chuẩn bị. Vui lòng quay lại sau.", 503);
      if (!session.queuedAt || now.getTime() - session.lastSeenAt.getTime() > 10_000) {
        session = await tx.battleSession.update({ where: { userId: user.id }, data: { queuedAt: now, lastSeenAt: now } });
      }
    }
    if (session.queuedAt) {
      if (command.heartbeat) await tx.battleSession.update({ where: { userId: user.id }, data: { lastSeenAt: now } });
      const opponent = await tx.battleSession.findFirst({ where: { userId: { not: user.id }, matchId: null, queuedAt: { not: null }, lastSeenAt: { gte: new Date(now.getTime() - 10_000) }, user: { isActive: true } }, orderBy: [{ queuedAt: "asc" }, { userId: "asc" }] });
      if (opponent || now.getTime() - session.queuedAt.getTime() >= QUEUE_MS) {
        const result = publicBattle(await createMatch(tx, user.id, opponent?.userId ?? null, now), user.id, now);
        recordBaseline("battle.queue_wait", now.getTime() - session.queuedAt.getTime());
        return result;
      }
      return { kind: "queue" as const, queuedAt: session.queuedAt.getTime(), serverNow: now.getTime() };
    }
    return { kind: "idle" as const, xp: live.xp, serverNow: now.getTime() };
    } catch (error) {
      // Commit elapsed turns and the throttle counter even when an answer is rejected.
      if (error instanceof BattleError) return { error: error.message, status: error.status };
      throw error;
    }
  }, { maxWait: 10_000, timeout: 15_000 }).then(result => {
    if ("error" in result && result.error) throw new BattleError(result.error, result.status);
    return result;
  });
}
