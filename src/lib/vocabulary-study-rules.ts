const intervals = [1, 3, 7, 14, 30, 60];
export const STUDY_GOALS = [5, 10, 15, 20] as const;

export function reviewSchedule(correct: boolean, step: number, now = new Date()) {
  const intervalStep = correct ? Math.min(Math.max(0, step) + 1, intervals.length) : 0;
  const delay = correct ? intervals[intervalStep - 1] * 86400000 : 10 * 60000;
  return { intervalStep, nextReviewAt: new Date(now.getTime() + delay) };
}

export function vietnamStudyDay(now = new Date()) {
  const day = new Date(now.getTime() + 7 * 3600000).toISOString().slice(0, 10);
  const start = new Date(`${day}T00:00:00+07:00`);
  return { start, end: new Date(start.getTime() + 86400000) };
}

export function studyScore(entries: { id: string; meaningVi: string }[], answers: Record<string, string>) {
  const details = entries.map(entry => ({ id: entry.id, correct: answers[entry.id]?.trim() === entry.meaningVi.trim(), meaning: entry.meaningVi }));
  const correct = details.filter(row => row.correct).length;
  return { correct, total: entries.length, passed: entries.length > 0 && correct * 100 >= entries.length * 80, details };
}
