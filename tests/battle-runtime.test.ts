import { expect, it } from "vitest";
import { ANSWER_GRACE_MS, ANSWER_MS, RESULT_MS } from "../src/lib/battle-rules";
import { answerRuntime, advanceRuntime, type BattleRuntime } from "../src/lib/battle-runtime";

function state(): BattleRuntime {
  return {
    questions: [{ type: "VOCABULARY", prompt: "QA", options: ["A", "B", "C", "D"], correct: 2, botChoice: null, botDelay: null }],
    index: 0, start: 1_000, answer: null, scores: [0, 0], correct: [0, 0], answered: [0, 0],
    lastSeen: [1_000, 1_000], receipts: [null, null],
  };
}

it("keeps a human turn open for the short answer grace window", () => {
  const runtime = state();
  const clickAt = runtime.start + ANSWER_MS + ANSWER_GRACE_MS - 1;
  expect(advanceRuntime(runtime, [true, false], clickAt)).toBeNull();
  answerRuntime(runtime, 2, clickAt);
  expect(runtime.answer).toMatchObject({ choice: 2, points: 100 });
  expect(advanceRuntime(runtime, [true, false], clickAt + RESULT_MS)).toEqual({ reason: "COMPLETE", at: clickAt + RESULT_MS, winner: 0 });
});
