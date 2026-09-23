import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
import { prisma } from "../src/lib/prisma";
import { battleCommand, type BattleView } from "../src/lib/battle-engine";
import { BATTLE_STARTER } from "../src/lib/battle-starter";
import { BATTLE_BOT_NAMES } from "../src/lib/battle-bot-names";
import { summarizeBaseline } from "../src/lib/performance-baseline";

// Explicitly isolated local database only; never run these writes against an application database.
const safe = process.env.BATTLE_INTEGRATION === "true" && /^postgresql:\/\/battle_qa:[^@]+@127\.0\.0\.1:55439\/battle_test(?:\?|$)/.test(process.env.DATABASE_URL ?? "");
const test = it.skipIf(!safe);
const prefix = `battle-qa-${Date.now()}`;
let serial = 0;
const created: string[] = [];
const matches = new Set<string>();
beforeAll(async () => {
  if (!safe) return;
  process.env.QUICK_BATTLE_ENABLED = "true";
  await prisma.battleQuestion.createMany({ data: BATTLE_STARTER, skipDuplicates: true });
});
afterAll(async () => {
  if (safe) {
    await prisma.battleMatch.deleteMany({ where: { id: { in: [...matches] } } });
    await prisma.user.deleteMany({ where: { id: { in: created } } });
  }
  await prisma.$disconnect();
});
async function user() {
  const id = `${prefix}-${serial++}`; created.push(id);
  return prisma.user.create({ data: { id, email: `${id}@example.invalid`, name: `QA ${serial}` } });
}
async function pair() {
  const [a, b] = await Promise.all([user(), user()]);
  const time = { value: Date.now() };
  const clock = () => new Date(time.value);
  await battleCommand(a, { action: "join", heartbeat: true }, clock);
  const state = await battleCommand(b, { action: "join", heartbeat: true }, clock);
  expect(state.kind).toBe("match");
  const match = state as BattleView; matches.add(match.id);
  return { a, b, match, time, clock };
}
test("concurrent joins across tabs allocate exactly one match and snapshots hide answers", async () => {
  const a = await user(), b = await user();
  const now = new Date();
  const results = await Promise.all(Array.from({ length: 8 }, (_, i) => battleCommand(i % 2 ? a : b, { action: "join", heartbeat: true }, () => now)));
  const ids = results.flatMap(r => r.kind === "match" ? [r.id] : []);
  expect(new Set(ids).size).toBe(1); ids.forEach(id => matches.add(id));
  const id = ids[0];
  const db = await prisma.battleMatch.findUniqueOrThrow({ where: { id }, include: { turns: true, players: true } });
  expect(db.turns).toHaveLength(30); expect(db.players).toHaveLength(2);
  const state = await battleCommand(a, { action: "state", matchId: id, heartbeat: true }, () => new Date(db.startsAt.getTime() + 1)) as BattleView;
  expect(state.current).not.toHaveProperty("correct"); expect(state.current).not.toHaveProperty("explanation"); expect(state.review).toEqual([]);
  expect(JSON.stringify(state)).not.toContain("@example.invalid");
  expect(JSON.stringify(state)).not.toContain("botChoice");
  await battleCommand(a, { action: "leave", matchId: id }, () => new Date(db.startsAt.getTime() + 100));
});
test("answers enforce ownership, timing, immutable selection and idempotence", async () => {
  const { a, b, match, time, clock } = await pair();
  const db = await prisma.battleMatch.findUniqueOrThrow({ where: { id: match.id }, include: { turns: { orderBy: { number: "asc" } }, players: true } });
  const owner = db.players.find(p => p.slot === 0)!.userId === a.id ? a : b;
  const other = owner.id === a.id ? b : a;
  const turn = db.turns[0];
  await expect(battleCommand(owner, { action: "answer", matchId: match.id, turn: 0, choice: turn.correct }, clock)).rejects.toThrow("chưa bắt đầu");
  time.value = db.startsAt.getTime() + 5000;
  await expect(battleCommand(other, { action: "answer", matchId: match.id, turn: 0, choice: turn.correct }, clock)).rejects.toThrow("Không phải lượt");
  const cmd = { action: "answer" as const, matchId: match.id, turn: 0, choice: turn.correct };
  const first = await battleCommand(owner, cmd, clock) as BattleView;
  const repeated = await battleCommand(owner, cmd, clock) as BattleView;
  expect(first.players[0].score).toBe(133); expect(repeated.players[0].score).toBe(133);
  expect(first.current).toMatchObject({ number: 0, answered: true, correct: turn.correct, nextAt: time.value + 2000 });
  await expect(battleCommand(other, { ...cmd, turn: 1 }, clock)).rejects.toThrow("chưa bắt đầu");
  await expect(battleCommand(owner, { ...cmd, choice: (turn.correct + 1) % 4 }, clock)).rejects.toThrow("không thể sửa");
  time.value += 1999;
  expect((await battleCommand(other, { action: "state", matchId: match.id }, clock) as BattleView).current?.number).toBe(0);
  time.value++;
  const next = await battleCommand(other, { action: "state", matchId: match.id }, clock) as BattleView;
  expect(next.current).toMatchObject({ number: 1, answered: false, deadline: time.value + 15000 });
  expect(next.current).not.toHaveProperty("correct");
  await battleCommand(owner, cmd, clock);
  expect(await prisma.battleAnswer.count({ where: { turnId: turn.id } })).toBe(1);
  time.value += 15000;
  // Keep the other player connected so deadline validation is reached.
  await prisma.battlePlayer.updateMany({ where: { matchId: match.id }, data: { lastSeenAt: clock() } });
  await expect(battleCommand(other, { ...cmd, turn: 1 }, clock)).rejects.toThrow();
  expect(await prisma.battleAnswer.count({ where: { turn: { matchId: match.id, number: 1 }, choice: null } })).toBe(1);
  const stranger = await user();
  await expect(battleCommand(stranger, { action: "state", matchId: match.id }, clock)).rejects.toThrow("không tham gia");
  await battleCommand(owner, { action: "leave", matchId: match.id }, clock);
});
test("bot threshold, cancel and real-player versus bot races do not overlap matches", async () => {
  const a = await user(), b = await user(); let now = Date.now(); const clock = () => new Date(now);
  await battleCommand(a, { action: "join", heartbeat: true }, clock);
  now += 29999;
  expect((await battleCommand(a, { action: "state", heartbeat: true }, clock)).kind).toBe("queue");
  now++;
  const results = await Promise.all([battleCommand(a, { action: "state", heartbeat: true }, clock), battleCommand(b, { action: "join", heartbeat: true }, clock)]);
  const state = results[0] as BattleView; expect(state.kind).toBe("match"); matches.add(state.id);
  if (results[1].kind === "match") matches.add(results[1].id);
  const playing = await prisma.battlePlayer.count({ where: { userId: a.id, match: { status: "ACTIVE" } } }); expect(playing).toBe(1);
  await battleCommand(a, { action: "leave", matchId: state.id }, clock);
  await battleCommand(b, { action: "cancel" }, clock);
  const c = await user(); await battleCommand(c, { action: "join", heartbeat: true }, clock);
  await battleCommand(c, { action: "cancel" }, clock); now += 30001;
  expect((await battleCommand(c, { action: "state", heartbeat: true }, clock)).kind).toBe("idle");
});
test("30 turns complete with once-only rewards and a five-reward Vietnam-day cap", async () => {
  const { a, b, match, time, clock } = await pair();
  const db = await prisma.battleMatch.findUniqueOrThrow({ where: { id: match.id }, include: { turns: { orderBy: { number: "asc" } }, players: { orderBy: { slot: "asc" } } } });
  for (let i = 0; i < 30; i++) {
    time.value = db.startsAt.getTime() + i * 7000 + 5000;
    await battleCommand(a, { action: "state", matchId: match.id, heartbeat: true }, clock);
    await battleCommand(b, { action: "state", matchId: match.id, heartbeat: true }, clock);
    const owner = db.players[i % 2].userId === a.id ? a : b;
    await battleCommand(owner, { action: "answer", matchId: match.id, turn: i, choice: db.turns[i].correct }, clock);
  }
  time.value = db.startsAt.getTime() + 30 * 7000;
  const result = await battleCommand(a, { action: "state", matchId: match.id, heartbeat: true }, clock) as BattleView;
  expect(result.status).toBe("FINISHED"); expect(result.winnerSlot).toBe(null); expect(result.players.map(p => p.correct)).toEqual([15, 15]);
  expect(result.players.map(p => p.xp)).toEqual([25, 25]); expect(result.review).toHaveLength(30);
  await Promise.all(Array.from({ length: 5 }, () => battleCommand(a, { action: "state", matchId: match.id }, clock)));
  expect((await prisma.user.findUniqueOrThrow({ where: { id: a.id } })).xp).toBe(25);
  expect(await prisma.battleReward.count({ where: { userId: a.id } })).toBe(1);
  // Five additional completed fixtures exercise reward settlement through the real transaction path.
  for (let j = 0; j < 5; j++) {
    time.value += 10000;
    await battleCommand(a, { action: "join", heartbeat: true }, clock);
    const s = await battleCommand(b, { action: "join", heartbeat: true }, clock) as BattleView; matches.add(s.id);
    const start = s.startsAt; time.value = start + 30 * 17000;
    await prisma.battlePlayer.updateMany({ where: { matchId: s.id }, data: { lastSeenAt: clock() } });
    await battleCommand(a, { action: "state", matchId: s.id }, clock);
  }
  expect(await prisma.battleReward.count({ where: { userId: a.id, xp: { gt: 0 } } })).toBe(5);
  expect((await prisma.user.findUniqueOrThrow({ where: { id: a.id } })).xp).toBe(125);
}, 30000);
test("reconnect expiry, double disconnect and deleted account privacy", async () => {
  const p = await pair();
  p.time.value += 25000;
  expect((await battleCommand(p.a, { action: "state", matchId: p.match.id, heartbeat: true }, p.clock) as BattleView).status).toBe("ACTIVE");
  p.time.value += 6000;
  const result = await battleCommand(p.a, { action: "state", matchId: p.match.id, heartbeat: true }, p.clock) as BattleView;
  expect(result.reason).toBe("DISCONNECTED"); expect(result.winnerSlot).toBe(result.mySlot); expect(result.players[result.mySlot].xp).toBe(0);
  const q = await pair(); q.time.value += 31000;
  expect((await battleCommand(q.a, { action: "state", matchId: q.match.id, heartbeat: true }, q.clock) as BattleView).status).toBe("CANCELLED");
  await prisma.user.delete({ where: { id: q.b.id } });
  const deleted = await battleCommand(q.a, { action: "state", matchId: q.match.id }, q.clock) as BattleView;
  expect(deleted.players[1 - deleted.mySlot].name).toBe("Người dùng đã xóa");
  expect(await prisma.battleReward.count({ where: { userId: q.b.id } })).toBe(0);
  const r = await user(); await prisma.user.update({ where: { id: r.id }, data: { isActive: false } });
  await expect(battleCommand(r, { action: "join" })).rejects.toThrow("đăng nhập lại");
});
test("bot uses saved independent choices and delayed actions; snapshots survive content edits", async () => {
  const a = await user(); let now = Date.now(); const clock = () => new Date(now);
  await battleCommand(a, { action: "join", heartbeat: true }, clock); now += 30000;
  const state = await battleCommand(a, { action: "state", heartbeat: true }, clock) as BattleView; matches.add(state.id);
  const match = await prisma.battleMatch.findUniqueOrThrow({ where: { id: state.id }, include: { turns: { orderBy: { number: "asc" } }, players: true } });
  const bot = match.players.find(p => p.isBot)!;
  expect(BATTLE_BOT_NAMES).toContain(bot.name);
  expect(state.players[bot.slot]).not.toHaveProperty("isBot");
  const firstBot = match.turns.find(t => t.slot === bot.slot)!;
  now = match.startsAt.getTime() + firstBot.number * 17000 + firstBot.botDelay! - 1;
  await prisma.battlePlayer.updateMany({ where: { matchId: match.id, userId: a.id }, data: { lastSeenAt: clock() } });
  const before = await battleCommand(a, { action: "state", heartbeat: true }, clock) as BattleView;
  expect(before.current).not.toHaveProperty("correct");
  now++;
  const after = await battleCommand(a, { action: "state", heartbeat: true }, clock) as BattleView;
  expect(after.current?.choice).toBe(firstBot.botChoice);
  expect(after.current?.points).toBe(firstBot.botChoice === firstBot.correct ? 100 + Math.floor(50 * (15000 - firstBot.botDelay!) / 15000) : 0);
  const nextAt = after.current!.nextAt;
  now = nextAt - 1;
  const replay = await battleCommand(a, { action: "state", matchId: match.id, heartbeat: true }, clock) as BattleView;
  expect(replay.current?.number).toBe(firstBot.number);
  expect(replay.current?.nextAt).toBe(nextAt);
  now++;
  const next = await battleCommand(a, { action: "state", matchId: match.id, heartbeat: true }, clock) as BattleView;
  expect(next.current).toMatchObject({ number: firstBot.number + 1, answered: false, deadline: nextAt + 15000 });
  const nextQuestion = match.turns[firstBot.number + 1];
  now += 1000;
  const wrong = await battleCommand(a, { action: "answer", matchId: match.id, turn: nextQuestion.number, choice: (nextQuestion.correct + 1) % 4 }, clock) as BattleView;
  expect(wrong.current).toMatchObject({ answered: true, points: 0, correct: nextQuestion.correct, nextAt: now + 2000 });
  now += 2000;
  expect((await battleCommand(a, { action: "state", matchId: match.id, heartbeat: true }, clock) as BattleView).current?.number).toBe(firstBot.number + 2);
  expect(await prisma.battleAnswer.count({ where: { turnId: firstBot.id } })).toBe(1);
  const source = await prisma.battleQuestion.findFirstOrThrow({ where: { prompt: firstBot.prompt } });
  await prisma.battleQuestion.update({ where: { id: source.id }, data: { prompt: "Temporary QA edit" } });
  expect((await prisma.battleTurn.findUniqueOrThrow({ where: { id: firstBot.id } })).prompt).toBe(firstBot.prompt);
  await prisma.battleQuestion.update({ where: { id: source.id }, data: { prompt: firstBot.prompt } });
  await battleCommand(a, { action: "leave", matchId: match.id }, clock);
});
test("forfeit reward requires three personal answers and locked sessions cannot play", async () => {
  const p = await pair();
  const players = await prisma.battlePlayer.findMany({ where: { matchId: p.match.id } });
  const winner = players.find(player => player.userId === p.a.id)!;
  await prisma.battlePlayer.update({ where: { id: winner.id }, data: { answered: 3 } });
  const state = await battleCommand(p.b, { action: "leave", matchId: p.match.id }, p.clock) as BattleView;
  expect(state.players[winner.slot].xp).toBe(60); expect(state.players[1 - winner.slot].xp).toBe(0);
  expect((await prisma.user.findUniqueOrThrow({ where: { id: p.a.id } })).xp).toBe(60);
  const u = await user(); await prisma.user.update({ where: { id: u.id }, data: { sessionVersion: 1 } });
  await expect(battleCommand(u, { action: "join" })).rejects.toThrow("đăng nhập lại");
  const throttled = await user(); const now = new Date();
  for (let i = 0; i < 40; i++) await battleCommand(throttled, { action: "state" }, () => now);
  await expect(battleCommand(throttled, { action: "state" }, () => now)).rejects.toMatchObject({ status: 429 });
  expect((await battleCommand(throttled, { action: "state" }, () => new Date(now.getTime() + 10000))).kind).toBe("idle");
});
test("20 simultaneous players pair once each and produce measurable local latency", async () => {
  const users = await Promise.all(Array.from({ length: 20 }, () => user()));
  const durations: number[] = [];
  const states = await Promise.all(users.map(async u => { const start = performance.now(); const result = await battleCommand(u, { action: "join", heartbeat: true }); durations.push(performance.now() - start); return result; }));
  states.forEach(s => { if (s.kind === "match") matches.add(s.id); });
  const sessions = await prisma.battleSession.findMany({ where: { userId: { in: users.map(u => u.id) } } });
  const ids = new Set(sessions.map(s => s.matchId)); expect(ids.size).toBe(10); expect(ids.has(null)).toBe(false);
  for (let round = 0; round < 6; round++) {
    const updates = await Promise.all(users.map(async u => { const start = performance.now(); const result = await battleCommand(u, { action: "state", heartbeat: round === 0 || round === 5 }); durations.push(performance.now() - start); return result; }));
    expect(updates.every(s => s.kind === "match")).toBe(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.info("Local isolated 20-player battle latency", summarizeBaseline(durations));
  mkdirSync(".qa", { recursive: true });
  writeFileSync(".qa/quick-battle-local-load.json", JSON.stringify({ environment: "isolated local PostgreSQL; not staging", players: 20, commandLatency: summarizeBaseline(durations) }, null, 2));
  for (const id of ids) {
    const u = users.find(u => sessions.find(s => s.userId === u.id)?.matchId === id)!;
    await battleCommand(u, { action: "leave", matchId: id! });
  }
}, 30000);
