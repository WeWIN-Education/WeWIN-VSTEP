import "server-only";
import { randomInt } from "node:crypto";
import { Prisma, type BattleMatch, type BattlePlayer, type BattleSession } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordBaseline } from "@/lib/performance-baseline";
import { ANSWER_MS, ANSWER_GRACE_MS, BATTLE_QUESTION_COUNT, RESULT_MS, QUEUE_MS, battleDay, battleRank, battleTurnStarts, botDecision, selectBattleQuestions, type BattleQuestionInput } from "./battle-rules";
import { answerRuntime, advanceRuntime, type BattleRuntime } from "./battle-runtime";
import { BATTLE_BOT_NAMES } from "./battle-bot-names";

type Tx = Prisma.TransactionClient;
type Actor = { id: string; sessionVersion: number };
type Player = BattlePlayer & { reward: { xp: number } | null };
type Match = BattleMatch & { players: Player[] };
export class BattleError extends Error { constructor(message: string, public status = 409) { super(message); } }
export type BattleCommand = { action: "state" | "join" | "cancel" | "answer" | "leave"; matchId?: string; turn?: number; choice?: number; heartbeat?: boolean };
const random = () => randomInt(0, 0x100000000) / 0x100000000;
export const BATTLE_LOCK = 9232601;
const playerInclude = { players: { orderBy: { slot: "asc" as const }, include: { reward: { select: { xp: true } } } } };

// Validate the live account, rate-limit and read its session in one round trip.
async function sessionFor(tx: Tx, user: Actor, now: Date) {
  const rows = await tx.$queryRaw<Array<BattleSession & { xp: number }>>`
    INSERT INTO "BattleSession" ("userId", "lastSeenAt", "windowAt", "requests")
    SELECT "id", ${now}, ${now}, 1 FROM "User"
    WHERE "id" = ${user.id} AND "isActive" = true AND "sessionVersion" = ${user.sessionVersion}
    ON CONFLICT ("userId") DO UPDATE SET
      "requests" = CASE WHEN "BattleSession"."windowAt" <= ${new Date(now.getTime() - 10_000)} THEN 1 ELSE "BattleSession"."requests" + 1 END,
      "windowAt" = CASE WHEN "BattleSession"."windowAt" <= ${new Date(now.getTime() - 10_000)} THEN ${now} ELSE "BattleSession"."windowAt" END
    RETURNING *, (SELECT "xp" FROM "User" WHERE "id" = ${user.id}) AS "xp"`;
  if (!rows[0]) throw new BattleError("Vui lòng đăng nhập lại.", 401);
  if (rows[0].requests > 40) throw new BattleError("Thao tác quá nhanh. Vui lòng chờ vài giây.", 429);
  return rows[0];
}

// Lock only this match; two bounded reads replace loading every turn/answer relation.
async function lockedMatch(tx: Tx, id: string) {
  const locked = await tx.$queryRaw<BattleMatch[]>`SELECT * FROM "BattleMatch" WHERE "id" = ${id} FOR UPDATE`;
  if (!locked[0]) throw new BattleError("Không tìm thấy trận đấu.", 404);
  const players = await tx.$queryRaw<Player[]>`SELECT p.*, CASE WHEN r."id" IS NULL THEN NULL ELSE jsonb_build_object('xp', r."xp") END AS reward
    FROM "BattlePlayer" p LEFT JOIN "BattleReward" r ON r."playerId" = p."id" WHERE p."matchId" = ${id} ORDER BY p."slot"`;
  return { ...locked[0], players };
}

// Keep already-running matches playable when deploying over the previous storage format.
async function runtimeFor(tx: Tx, match: Match, now: number): Promise<BattleRuntime> {
  if (match.runtime) return match.runtime as unknown as BattleRuntime;
  const turns = await tx.battleTurn.findMany({ where: { matchId: match.id }, orderBy: { number: "asc" }, include: { answer: true } });
  if (!turns.length) throw new BattleError("Không thể khôi phục trận đấu. Vui lòng về sảnh.");
  const starts = battleTurnStarts(match.startsAt, turns);
  let index = turns.findIndex(t => !t.answer || t.answer.createdAt.getTime() + RESULT_MS > now);
  if (index === -1) index = turns.length;
  return {
    questions: turns.map(t => ({ type: t.type as BattleQuestionInput["type"], prompt: t.prompt, options: t.options, correct: t.correct, botChoice: t.botChoice, botDelay: t.botDelay })),
    index, start: starts[index] ?? turns.at(-1)!.answer!.createdAt.getTime() + RESULT_MS,
    answer: turns[index]?.answer ? { choice: turns[index].answer!.choice, points: turns[index].answer!.points, at: turns[index].answer!.createdAt.getTime() } : null,
    scores: match.players.map(p => p.score), correct: match.players.map(p => p.correct), answered: match.players.map(p => p.answered),
    lastSeen: match.players.map(p => new Date(p.lastSeenAt).getTime()),
    receipts: match.players.map(p => { const t = turns.findLast(t => t.slot === p.slot && t.answer?.choice != null); return t ? { turn: t.number, choice: t.answer!.choice! } : null; }),
  };
}

export function publicBattle(match: Match, userId: string, now: Date, updatedXp: number | null = null) {
  const me = match.players.find(p => p.userId === userId);
  if (!me) throw new BattleError("Bạn không tham gia trận này.", 403);
  const state = match.runtime as unknown as BattleRuntime | null;
  const question = state?.questions[state.index];
  const current = match.status === "ACTIVE" && state && question && now.getTime() >= state.start ? {
    number: state.index, slot: state.index % 2, type: question.type, prompt: question.prompt, options: question.options,
    ...(state.answer ? { correct: question.correct, choice: state.answer.choice, points: state.answer.points } : {}),
    answered: Boolean(state.answer), deadline: state.start + ANSWER_MS,
    nextAt: (state.answer?.at ?? state.start + ANSWER_MS) + RESULT_MS,
  } : null;
  return { kind: "match" as const, id: match.id, status: match.status, reason: match.reason, winnerSlot: match.winnerSlot,
    startsAt: match.startsAt.getTime(), serverNow: now.getTime(), mySlot: me.slot, updatedXp,
    total: state?.questions.length ?? BATTLE_QUESTION_COUNT,
    players: match.players.map(p => ({ slot: p.slot, name: p.userId || p.isBot ? p.name : "Người dùng đã xóa", rank: p.rank,
      score: state?.scores[p.slot] ?? 0, correct: state?.correct[p.slot] ?? 0, xp: p.reward?.xp ?? 0 })), current };
}
export type BattleView = ReturnType<typeof publicBattle>;

async function finish(tx: Tx, match: Match, state: BattleRuntime, at: Date, reason: string, winner: number | null) {
  const status = reason === "BOTH_OFFLINE" ? "CANCELLED" : "FINISHED";
  // Stable user lock order makes daily caps safe even if separate matches finish together.
  const ids = match.players.flatMap(p => p.userId ? [p.userId] : []).sort();
  if (ids.length) await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" IN (${Prisma.join(ids)}) ORDER BY "id" FOR UPDATE`;
  for (const player of match.players) {
    if (!player.userId || player.isBot) continue;
    const eligible = status !== "CANCELLED" && (reason === "COMPLETE" || (winner === player.slot && state.answered[player.slot] >= 3));
    const day = battleDay(at);
    const count = eligible ? await tx.battleReward.count({ where: { userId: player.userId, day, xp: { gt: 0 } } }) : 5;
    const xp = eligible && count < 5 ? winner === null ? 25 : winner === player.slot ? 60 : 10 : 0;
    await tx.battleReward.create({ data: { playerId: player.id, userId: player.userId, day, xp, createdAt: at } });
    if (xp) await tx.user.update({ where: { id: player.userId }, data: { xp: { increment: xp } } });
    player.reward = { xp };
  }
  await tx.battleMatch.update({ where: { id: match.id }, data: { status, reason, winnerSlot: winner, finishedAt: at, runtime: Prisma.DbNull } });
  await tx.battleSession.updateMany({ where: { matchId: match.id }, data: { matchId: null, queuedAt: null } });
  Object.assign(match, { status, reason, winnerSlot: winner, finishedAt: at, runtime: null });
}

async function matchCommand(user: Actor, id: string, command: BattleCommand, clock: () => Date) {
  return prisma.$transaction(async tx => {
    const match = await lockedMatch(tx, id);
    const now = clock();
    const session = await sessionFor(tx, user, now);
    const player = match.players.find(p => p.userId === user.id);
    if (!player) throw new BattleError("Bạn không tham gia trận này.", 403);
    let error: BattleError | undefined;
    if (match.status === "ACTIVE") {
      const state = await runtimeFor(tx, match, now.getTime());
      const before = JSON.stringify(state);
      const end = advanceRuntime(state, match.players.map(p => !p.isBot), now.getTime());
      if (end) await finish(tx, match, state, new Date(end.at), end.reason, end.winner);
      else if (command.action === "leave") await finish(tx, match, state, now, "FORFEIT", 1 - player.slot);
      else {
        if (command.heartbeat || command.action === "answer") state.lastSeen[player.slot] = now.getTime();
        if (command.action === "answer") {
          const receipt = state.receipts[player.slot];
          if (command.turn! % 2 !== player.slot) error = new BattleError("Không phải lượt của bạn.");
          else if (receipt && receipt.turn === command.turn) {
            if (receipt.choice !== command.choice) error = new BattleError("Đáp án đã được ghi nhận, không thể sửa.");
          } else if (command.turn !== state.index || state.answer || now.getTime() < state.start || now.getTime() >= state.start + ANSWER_MS + ANSWER_GRACE_MS) {
            error = new BattleError("Lượt này chưa bắt đầu hoặc đã hết giờ.");
          } else answerRuntime(state, command.choice!, now.getTime());
        }
        const serialized = JSON.stringify(state);
        if (!match.runtime || serialized !== before) await tx.battleMatch.update({ where: { id }, data: { runtime: JSON.parse(serialized) } });
        match.runtime = JSON.parse(serialized);
      }
    }
    // Return domain errors after committing clock progress; retries cannot rewind a turn.
    if (error) return { error };
    const xp = match.status === "ACTIVE" ? null : (await tx.user.findUnique({ where: { id: user.id }, select: { xp: true } }))?.xp ?? session.xp;
    return { view: publicBattle(match, user.id, now, xp) };
  }, { maxWait: 5000, timeout: 15000 }).then(result => { if (result.error) throw result.error; return result.view!; });
}

async function createMatch(tx: Tx, userId: string, otherId: string | null, now: Date) {
  const users = await tx.user.findMany({ where: { id: { in: otherId ? [userId, otherId] : [userId] }, isActive: true }, select: { id: true, name: true, xp: true } });
  if (users.length !== (otherId ? 2 : 1)) throw new BattleError("Tài khoản không còn hoạt động.", 403);
  const pool = await tx.battleQuestion.findMany({ where: { published: true } });
  const questions = selectBattleQuestions(pool as BattleQuestionInput[], random);
  const human = users.find(u => u.id === userId)!;
  const opponent = otherId ? users.find(u => u.id === otherId)! : null;
  const sides = random() < 0.5 ? [human, opponent] : [opponent, human];
  const names = BATTLE_BOT_NAMES.filter(name => name !== human.name?.trim());
  const botName = names[randomInt(names.length)];
  const startsAt = new Date(now.getTime() + 3000);
  const state: BattleRuntime = {
    questions: questions.map((q, number) => { const bot = !sides[number % 2] ? botDecision(q.correct, random) : null;
      return { type: q.type, prompt: q.prompt, options: q.options, correct: q.correct, botChoice: bot?.choice ?? null, botDelay: bot?.delay ?? null }; }),
    index: 0, start: startsAt.getTime(), answer: null, scores: [0, 0], correct: [0, 0], answered: [0, 0], lastSeen: [now.getTime(), now.getTime()], receipts: [null, null],
  };
  const match = await tx.battleMatch.create({ data: { startsAt, runtime: JSON.parse(JSON.stringify(state)),
    players: { create: sides.map((u, slot) => ({ userId: u?.id, slot, isBot: !u, name: u?.name?.trim() || (u ? "Học viên WEWIN" : botName), rank: battleRank(u?.xp ?? human.xp), lastSeenAt: now })) },
  }, include: playerInclude });
  await tx.battleSession.updateMany({ where: { userId: { in: users.map(u => u.id) } }, data: { matchId: match.id, queuedAt: null } });
  return match;
}

export async function battleCommand(user: Actor, command: BattleCommand, clock: () => Date = () => new Date()) {
  if (command.matchId) return matchCommand(user, command.matchId, command, clock);
  // Idle pages and resumed matches do not compete for the matchmaking lock.
  if (command.action === "state") {
    const session = await sessionFor(prisma, user, clock());
    if (session.matchId) return matchCommand(user, session.matchId, command, clock);
    if (!session.queuedAt) return { kind: "idle" as const, xp: session.xp, serverNow: clock().getTime() };
  }
  const result = await prisma.$transaction(async tx => {
    // ponytail: only the short matchmaking transaction is global (20-player target); shard queues if measured contention grows.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${BATTLE_LOCK})`;
    const now = clock();
    const session = await sessionFor(tx, user, now);
    if (session.matchId) return { resume: session.matchId };
    if (command.action === "answer" || command.action === "leave") throw new BattleError("Không có trận đang chơi.");
    if (command.action === "cancel") {
      await tx.battleSession.update({ where: { userId: user.id }, data: { queuedAt: null } });
      return { kind: "idle" as const, xp: session.xp, serverNow: now.getTime() };
    }
    let queuedAt = session.queuedAt;
    if (command.action === "join") {
      if (process.env.QUICK_BATTLE_ENABLED !== "true") throw new BattleError("Quick Battle đang được chuẩn bị. Vui lòng quay lại sau.", 503);
      const counts = await tx.battleQuestion.groupBy({ by: ["type"], where: { published: true }, _count: true });
      if (["VOCABULARY", "GRAMMAR", "PHRASES"].some(type => (counts.find(c => c.type === type)?._count ?? 0) < 10)) throw new BattleError("Ngân hàng câu hỏi đang được chuẩn bị. Vui lòng quay lại sau.", 503);
      if (!queuedAt || now.getTime() - session.lastSeenAt.getTime() > 10_000) queuedAt = now;
    }
    if (!queuedAt) return { kind: "idle" as const, xp: session.xp, serverNow: now.getTime() };
    if (command.heartbeat || command.action === "join") await tx.battleSession.update({ where: { userId: user.id }, data: { queuedAt, lastSeenAt: now } });
    const opponent = await tx.battleSession.findFirst({ where: { userId: { not: user.id }, matchId: null, queuedAt: { not: null }, lastSeenAt: { gte: new Date(now.getTime() - 10_000) }, user: { isActive: true } }, orderBy: [{ queuedAt: "asc" }, { userId: "asc" }] });
    if (opponent || now.getTime() - queuedAt.getTime() >= QUEUE_MS) {
      const view = publicBattle(await createMatch(tx, user.id, opponent?.userId ?? null, now), user.id, now);
      recordBaseline("battle.queue_wait", now.getTime() - queuedAt.getTime());
      return view;
    }
    return { kind: "queue" as const, queuedAt: queuedAt.getTime(), serverNow: now.getTime() };
  }, { maxWait: 5000, timeout: 15000 });
  return "resume" in result ? matchCommand(user, result.resume!, command, clock) : result;
}
