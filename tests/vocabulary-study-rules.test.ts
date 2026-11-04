import { expect, it } from "vitest";
import { reviewSchedule, studyScore, vietnamStudyDay } from "../src/lib/vocabulary-study-rules";

it("opens the next lesson at exactly 80%, including short final lessons", () => {
  const words = Array.from({ length: 5 }, (_, i) => ({ id: String(i), meaningVi: `nghĩa ${i}` }));
  expect(studyScore(words, { 0: "nghĩa 0", 1: "nghĩa 1", 2: "nghĩa 2" }).passed).toBe(false);
  const result = studyScore(words, { 0: "nghĩa 0", 1: "nghĩa 1", 2: "nghĩa 2", 3: "nghĩa 3" });
  expect(result.passed).toBe(true);
  expect(result.details.filter(row => !row.correct).map(row => row.id)).toEqual(["4"]);
  expect(studyScore([], {}).passed).toBe(false);
  expect(studyScore(words.slice(0, 1), { 0: "nghĩa 0" }).passed).toBe(true);
});

it("spaces successful reviews and returns forgotten words in ten minutes", () => {
  const now = new Date("2026-11-04T00:00:00Z");
  expect(reviewSchedule(true, 0, now).nextReviewAt.toISOString()).toBe("2026-11-05T00:00:00.000Z");
  expect(reviewSchedule(true, 1, now).nextReviewAt.toISOString()).toBe("2026-11-07T00:00:00.000Z");
  expect(reviewSchedule(true, 500, now).intervalStep).toBe(6);
  expect(reviewSchedule(false, 5, now)).toEqual({ intervalStep: 0, nextReviewAt: new Date("2026-11-04T00:10:00Z") });
});

it("counts daily goals using the Vietnam day boundary", () => {
  const day = vietnamStudyDay(new Date("2026-11-04T17:01:00Z"));
  expect(day.start.toISOString()).toBe("2026-11-04T17:00:00.000Z");
  expect(day.end.toISOString()).toBe("2026-11-05T17:00:00.000Z");
});
