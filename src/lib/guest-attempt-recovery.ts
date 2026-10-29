import { object, savedAnswers } from "./exam-submission";

export function guestAttemptState(attempt: { status: string; expiresAt: Date | null; answers: unknown; recordings: unknown }, now = new Date()) {
  if (attempt.status === "IN_PROGRESS" && (!attempt.expiresAt || attempt.expiresAt > now)) return "resume";
  const saved = savedAnswers(attempt.answers);
  const hasText = [...Object.values(saved.answers), ...Object.values(saved.writingAnswers)].some(value => typeof value === "string" && value.trim());
  // Recover abandoned empty trials without granting another graded attempt.
  return !hasText && !Object.keys(object(attempt.recordings)).length ? "restart" : "finished";
}
