import { expect, it } from "vitest";
import { BATTLE_STARTER } from "../src/lib/battle-starter";
import { BATTLE_BOT_NAMES } from "../src/lib/battle-bot-names";
import { BATTLE_TYPES, battleDay, battlePoints, battleRank, botDecision, selectBattleQuestions, validateBattleQuestion } from "../src/lib/battle-rules";

function seeded() { let n = 9821; return () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 2 ** 32; }; }
it("contains exactly 150 unique validated B1 questions with 50 per type", () => {
  expect(BATTLE_STARTER).toHaveLength(150);
  expect(new Set(BATTLE_STARTER.map(q => q.prompt)).size).toBe(150);
  for (const t of BATTLE_TYPES) expect(BATTLE_STARTER.filter(q => q.type === t)).toHaveLength(50);
  for (const q of BATTLE_STARTER) expect(validateBattleQuestion(q)).toMatchObject({ correct: q.correct });
  expect(BATTLE_STARTER[1].options[BATTLE_STARTER[1].correct]).toBe("heavy");
});
it("rejects duplicate options, invalid answer indices and oversized questions", () => {
  const q = BATTLE_STARTER[0];
  for (const patch of [{ options: ["A", " a ", "B", "C"] }, { correct: 4 }, { correct: 0.5 }, { prompt: "x".repeat(241) }, { explanation: "" }, { published: "true" }]) expect(() => validateBattleQuestion({ ...q, ...patch })).toThrow();
});
it("selects 15 distinct questions with 5 per type", () => {
  const random = seeded();
  for (let run = 0; run < 100; run++) {
    const selected = selectBattleQuestions(BATTLE_STARTER, random);
    expect(selected).toHaveLength(15);
    expect(new Set(selected.map(q => q.sourceKey)).size).toBe(15);
    for (const t of BATTLE_TYPES) expect(selected.filter(q => q.type === t)).toHaveLength(5);
  }
  expect(() => selectBattleQuestions(BATTLE_STARTER.slice(0, 10), random)).toThrow();
});
it("scores only within the server answer window and covers rank/day boundaries", () => {
  expect([0, 7500, 14999, 15000, -1].map(battlePoints)).toEqual([150, 125, 100, 0, 0]);
  expect([0, 499, 500, 1499, 1500, 3499, 3500, 6999, 7000, 11999, 12000].map(battleRank)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5]);
  expect(battleDay(new Date("2026-09-23T16:59:59Z"))).toBe("2026-09-23");
  expect(battleDay(new Date("2026-09-23T17:00:00Z"))).toBe("2026-09-24");
});
it("bot decisions approximate independent 80% accuracy with varied 2–6s delay", () => {
  const random = seeded(); let correct = 0;
  const answers = Array.from({ length: 20000 }, () => botDecision(2, random));
  for (const a of answers) { if (a.choice === 2) correct++; expect(a.delay).toBeGreaterThanOrEqual(2000); expect(a.delay).toBeLessThanOrEqual(6000); }
  expect(correct / answers.length).toBeGreaterThan(.78); expect(correct / answers.length).toBeLessThan(.82);
  expect(new Set(answers.map(a => a.choice)).size).toBe(4);
  expect(new Set(answers.map(a => a.delay)).size).toBeGreaterThan(100);
  expect(BATTLE_BOT_NAMES).toHaveLength(100);
  expect(new Set(BATTLE_BOT_NAMES).size).toBe(100);
});
