export const BATTLE_TYPES = ["VOCABULARY", "GRAMMAR", "PHRASES"] as const;
export type BattleType = typeof BATTLE_TYPES[number];
export const TYPE_LABELS: Record<BattleType, string> = { VOCABULARY: "Từ vựng", GRAMMAR: "Ngữ pháp", PHRASES: "Cụm từ" };
export const ANSWER_MS = 15_000;
export const RESULT_MS = 1_000;
export const QUEUE_MS = 5_000;
export const DISCONNECT_MS = 30_000;
export const RANKS = [
  { name: "Đồng", min: 0, badge: "/battle/ranks/bronze.png" }, { name: "Bạc", min: 500, badge: "/battle/ranks/silver.png" }, { name: "Vàng", min: 1500, badge: "/battle/ranks/gold.png" },
  { name: "Bạch Kim", min: 3500, badge: "/battle/ranks/platinum.png" }, { name: "Kim Cương", min: 7000, badge: "/battle/ranks/diamond.png" }, { name: "Cao Thủ", min: 12000, badge: "/battle/ranks/master.png" },
] as const;
// Derive the schedule from persisted answers so reloads and all players share the same clock.
export function battleTurnStarts(startsAt: Date, turns: readonly { answer: { createdAt: Date } | null }[]) {
  let start = startsAt.getTime();
  return turns.map(turn => {
    const current = start;
    start = (turn.answer?.createdAt.getTime() ?? start + ANSWER_MS) + RESULT_MS;
    return current;
  });
}
export function battleRank(xp: number) { return RANKS.findLastIndex(rank => xp >= rank.min); }
export function battlePoints(elapsed: number) {
  return elapsed >= 0 && elapsed < ANSWER_MS ? 100 + Math.floor(50 * (ANSWER_MS - elapsed) / ANSWER_MS) : 0;
}
export function battleDay(now: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export type BattleQuestionInput = { type: BattleType; difficulty: number; prompt: string; options: string[]; correct: number; explanation: string; published: boolean };
export function validateBattleQuestion(value: unknown): BattleQuestionInput {
  if (!value || typeof value !== "object") throw new Error("Câu hỏi không hợp lệ.");
  const v = value as Record<string, unknown>;
  if (!BATTLE_TYPES.includes(v.type as BattleType) || ![1, 2, 3].includes(v.difficulty as number)
    || typeof v.prompt !== "string" || !v.prompt.trim() || v.prompt.length > 240
    || !Array.isArray(v.options) || v.options.length !== 4 || v.options.some(o => typeof o !== "string" || !o.trim() || o.length > 90)
    || new Set(v.options.map(o => o.trim().toLocaleLowerCase())).size !== 4
    || !Number.isInteger(v.correct) || Number(v.correct) < 0 || Number(v.correct) > 3
    || typeof v.explanation !== "string" || !v.explanation.trim() || v.explanation.length > 1200
    || typeof v.published !== "boolean") throw new Error("Nhập đề (tối đa 240 ký tự), 4 lựa chọn khác nhau, đáp án đúng, giải thích và độ khó 1–3.");
  return { type: v.type as BattleType, difficulty: Number(v.difficulty), prompt: v.prompt.trim(), options: v.options.map(o => o.trim()), correct: Number(v.correct), explanation: v.explanation.trim(), published: v.published };
}
export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
// Adjacent difficulty pairs give each side the same distribution where the pool permits it.
export function selectBattleQuestions<T extends BattleQuestionInput>(pool: T[], random: () => number) {
  const sides: [T[], T[]] = [[], []];
  for (const type of BATTLE_TYPES) {
    const selected = shuffle(pool.filter(q => q.type === type), random).slice(0, 10).sort((a, b) => a.difficulty - b.difficulty);
    if (selected.length < 10) throw new Error("Cần ít nhất 10 câu đã xuất bản cho mỗi dạng.");
    for (let i = 0; i < 10; i += 2) {
      const pair = shuffle(selected.slice(i, i + 2), random); sides[0].push(pair[0]); sides[1].push(pair[1]);
    }
  }
  const a = shuffle(sides[0], random), b = shuffle(sides[1], random);
  return a.flatMap((q, i) => [q, b[i]]);
}
export function botDecision(correct: number, random: () => number) {
  const choice = random() < 0.8 ? correct : [0, 1, 2, 3].filter(i => i !== correct)[Math.floor(random() * 3)];
  return { choice, delay: 2000 + Math.floor(random() * 4001) };
}
