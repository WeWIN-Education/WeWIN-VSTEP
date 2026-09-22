import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { parseLearningExercise } from "../src/lib/learning-exercise";

const source = readFileSync("content/vstep/bai-tap-vstep-b1-b2-v1.txt", "utf8");

function bodyFor(code: string) {
  const start = source.indexOf(`# ${code} `);
  const next = source.indexOf("\n# P_", start + 1);
  return source.slice(start, next < 0 ? source.length : next);
}

it("parses Listening as one timed question set without exposing the transcript in the source model", () => {
  const exercise = parseLearningExercise(bodyFor("P_L003"), "LISTENING");
  expect(exercise).not.toBeNull();
  expect(exercise?.questions).toHaveLength(5);
  expect(exercise?.durationMinutes).toBe(7);
  expect(exercise?.transcript).toContain("Many cities are trying");
});

it("uses the ten-question Reading time limit and keeps the passage separate", () => {
  const exercise = parseLearningExercise(bodyFor("P_R003"), "READING");
  expect(exercise?.questions).toHaveLength(10);
  expect(exercise?.durationMinutes).toBe(10);
  expect(exercise?.sourceText).toContain("Remote work has changed");
});

it("reveals Writing and Speaking self-review material only through the parsed submission model", () => {
  const writing = parseLearningExercise(bodyFor("P_W001"), "WRITING");
  const speaking = parseLearningExercise(bodyFor("P_S001"), "SPEAKING");
  expect(writing?.durationMinutes).toBe(10);
  expect(writing?.sample).toContain("Dear Ms Lan");
  expect(writing?.checklist.length).toBeGreaterThan(0);
  expect(speaking?.sample).toContain("At weekends");
  expect(speaking?.speakingQuestions).toHaveLength(3);
  expect(speaking?.vocabulary).toEqual(expect.arrayContaining(["Answer", "Reason", "Example"]));
});
