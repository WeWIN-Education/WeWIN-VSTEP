export const DAILY_CHALLENGE_REWARD = 180;
export function vietnamDay(now = new Date()) {
  // Vietnam is UTC+7 year-round; UTC boundaries avoid the server's local timezone.
  const key = new Date(now.getTime() + 7 * 3600000).toISOString().slice(0, 10);
  const start = new Date(`${key}T00:00:00+07:00`);
  return { key, day: new Date(`${key}T00:00:00Z`), start, end: new Date(start.getTime() + 86400000) };
}
export function dailyChallengeTasks(words: number, xp: number, day: string, catalogs: string[] = []) {
  const rotation = new Date(`${day}T00:00:00Z`).getUTCDay();
  const skills = ["LISTENING", "READING", "WRITING", "SPEAKING"];
  const completed = new Set(catalogs.includes("FULL") ? skills : catalogs.filter(value => skills.includes(value)));
  const wordGoal = [30, 10, 15, 20, 15, 20, 25][rotation];
  const xpGoal = [100, 50, 50, 75, 50, 75, 100][rotation];
  const skill = skills[(rotation + 2) % 4];
  const titles: Record<string, string> = { LISTENING: "Nộp 1 bài Listening", READING: "Nộp 1 bài Reading", WRITING: "Nộp 1 bài Writing", SPEAKING: "Nộp 1 bài Speaking" };
  const third = rotation === 0 || rotation === 6
    ? { id: "mix", title: "Luyện 2 kỹ năng khác nhau", value: completed.size, goal: 2, href: "/exam/vstep" }
    : rotation === 1
      ? { id: "exam", title: "Nộp 1 bài VSTEP", value: catalogs.length, goal: 1, href: "/exam/vstep" }
      : { id: skill.toLowerCase(), title: titles[skill], value: Number(completed.has(skill)), goal: 1, href: "/exam/vstep" };
  return [
    { id: "words", title: `Ôn ${wordGoal} từ`, value: words, goal: wordGoal, href: "/vocabulary/topics" },
    { id: "xp", title: `Kiếm ${xpGoal} XP`, value: xp, goal: xpGoal, href: "/exam/vstep" },
    third,
  ].map(task => ({ ...task, value: Math.min(task.goal, Math.max(0, task.value)) }));
}
export type DailyChallengeSummary = {
  day: string; resetsAt: string; serverNow: string; claimed: boolean; reward: number;
  tasks: ReturnType<typeof dailyChallengeTasks>;
};
