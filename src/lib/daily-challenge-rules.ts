export const DAILY_CHALLENGE_REWARD = 180;
export function vietnamDay(now = new Date()) {
  // Vietnam is UTC+7 year-round; UTC boundaries avoid the server's local timezone.
  const key = new Date(now.getTime() + 7 * 3600000).toISOString().slice(0, 10);
  const start = new Date(`${key}T00:00:00+07:00`);
  return { key, day: new Date(`${key}T00:00:00Z`), start, end: new Date(start.getTime() + 86400000) };
}
export function dailyChallengeTasks(words: number, xp: number) {
  return [
    { id: "words", title: "Ôn 30 từ", value: Math.min(30, Math.max(0, words)), goal: 30, href: "/vocabulary/topics" },
    { id: "xp50", title: "Kiếm 50 XP", value: Math.min(50, Math.max(0, xp)), goal: 50, href: "/exam/vstep" },
    { id: "xp150", title: "Kiếm 150 XP", value: Math.min(150, Math.max(0, xp)), goal: 150, href: "/exam/vstep" },
  ];
}
export type DailyChallengeSummary = {
  day: string; resetsAt: string; serverNow: string; claimed: boolean; reward: number;
  tasks: ReturnType<typeof dailyChallengeTasks>;
};
