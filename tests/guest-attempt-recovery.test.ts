import { expect, it } from "vitest";
import { guestAttemptState } from "../src/lib/guest-attempt-recovery";

const now = new Date("2026-10-29T12:00:00Z");
const attempt = { status: "IN_PROGRESS", expiresAt: new Date(+now + 60_000), answers: {}, recordings: {} };
it("resumes a valid trial without resetting its timer", () => {
  expect(guestAttemptState(attempt, now)).toBe("resume");
});
it.each(["IN_PROGRESS", "SUBMITTED"])("recovers an empty %s trial with an expired timer", status => {
  expect(guestAttemptState({ ...attempt, status, expiresAt: new Date(+now - 1) }, now)).toBe("restart");
});
it.each([
  { answers: { q1: "A" } },
  { answers: { answers: { q1: "B" }, writingAnswers: {} } },
  { answers: { writingAnswers: { w1: "My essay" } } },
  { answers: { writing: { w1: "Legacy essay" } } },
  { recordings: { s1: { storageKey: "exam-recordings/test/s1.webm" } } },
])("preserves completed work and does not grant another graded trial: %j", saved => {
  expect(guestAttemptState({ ...attempt, status: "SUBMITTED", ...saved }, now)).toBe("finished");
});
