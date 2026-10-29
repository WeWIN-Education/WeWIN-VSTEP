import { expect, it } from "vitest";
import { fixtureForCatalog, fixtureFromRecord } from "../src/lib/vstep-paper";
import type { StoredVstepPublic } from "../src/lib/vstep-paper";
const paper: StoredVstepPublic = {
  version: 1, slug: "qa", title: "QA", subtitle: "", target: "B1", durationMinutes: 179, questionCount: 4,
  listening: { instructions: "Listen", parts: [{ id: "l1", title: "L", instructions: "", audioUrl: "/audio", durationSeconds: 30, questions: [{ id: "lq1", number: 1, prompt: "Q", options: ["A", "B"] }] }] },
  reading: { instructions: "Read", passages: [{ id: "r1", title: "R", text: "A long passage", questions: [] }] },
  writing: [{ id: "w1", title: "W", durationMinutes: 60, minimumWords: 120, prompt: "Write" }],
  speaking: { parts: [{ id: "s1", title: "S", prompt: "Speak", questions: [] }] },
};
const exam = fixtureFromRecord({ slug: "qa", programme: "VSTEP", title: "QA", subtitle: "", target: "B1", durationMin: 179, questionCount: 4, sections: paper as never })!;
it.each(["LISTENING", "READING", "WRITING", "SPEAKING"] as const)("sends only %s content, preserving part metadata and the original paper", catalog => {
  const result = fixtureForCatalog(exam, catalog);
  expect(result.parts).toEqual(exam.parts);
  const arrays = [result.content!.listening.parts, result.content!.reading.passages, result.content!.writing, result.content!.speaking.parts];
  expect(arrays.map(a => a.length)).toEqual(["LISTENING", "READING", "WRITING", "SPEAKING"].map(skill => skill === catalog ? 1 : 0));
  expect(paper.listening.parts).toHaveLength(1);
  expect(paper.writing).toHaveLength(1);
  expect(JSON.stringify(result).length).toBeLessThan(JSON.stringify(exam).length);
});
it("keeps the full exam intact", () => { expect(fixtureForCatalog(exam, "FULL")).toBe(exam); });
