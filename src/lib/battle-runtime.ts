import { ANSWER_MS, ANSWER_GRACE_MS, RESULT_MS, DISCONNECT_MS, battlePoints, type BattleQuestionInput } from "./battle-rules";

export type RuntimeQuestion = Pick<BattleQuestionInput, "type" | "prompt" | "options" | "correct"> & { botChoice: number | null; botDelay: number | null };
export type BattleRuntime = {
  questions: RuntimeQuestion[];
  index: number;
  start: number;
  answer: { choice: number | null; points: number; at: number } | null;
  scores: number[];
  correct: number[];
  answered: number[];
  lastSeen: number[];
  // Only the latest receipt for each player is needed to make a retried submission idempotent.
  receipts: Array<{ turn: number; choice: number } | null>;
};

export function answerRuntime(state: BattleRuntime, choice: number | null, at: number) {
  const slot = state.index % 2;
  const elapsed = Math.min(Math.max(at - state.start, 0), ANSWER_MS - 1);
  const points = choice === state.questions[state.index].correct ? battlePoints(elapsed) : 0;
  state.answer = { choice, points, at };
  state.scores[slot] += points;
  state.correct[slot] += points > 0 ? 1 : 0;
  if (choice !== null) {
    state.answered[slot]++;
    state.receipts[slot] = { turn: state.index, choice };
  }
}

export function advanceRuntime(state: BattleRuntime, humans: boolean[], now: number) {
  const offline = state.lastSeen.flatMap((seen, slot) => humans[slot] && now - seen > DISCONNECT_MS ? [slot] : []);
  const disconnectAt = offline.length ? Math.min(...offline.map(slot => state.lastSeen[slot] + DISCONNECT_MS)) : Infinity;
  const until = Math.min(now, disconnectAt);
  while (state.index < state.questions.length) {
    const question = state.questions[state.index];
    if (!state.answer) {
      const bot = question.botDelay !== null;
      const resolveAt = state.start + (bot ? question.botDelay! : ANSWER_MS);
      const due = bot ? resolveAt : resolveAt + ANSWER_GRACE_MS;
      if (due > until) break;
      answerRuntime(state, bot ? question.botChoice : null, resolveAt);
    }
    const next = state.answer!.at + RESULT_MS;
    if (next > until) break;
    state.start = next;
    state.index++;
    state.answer = null;
  }
  if (state.index === state.questions.length) {
    return { reason: "COMPLETE", at: state.start, winner: state.scores[0] === state.scores[1] ? null : state.scores[0] > state.scores[1] ? 0 : 1 };
  }
  if (offline.length) return { reason: offline.length === 2 ? "BOTH_OFFLINE" : "DISCONNECTED", at: disconnectAt, winner: offline.length === 2 ? null : 1 - offline[0] };
  return null;
}
