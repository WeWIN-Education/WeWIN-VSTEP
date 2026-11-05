import { describe, expect, it } from "vitest";
import pilot from "../src/data/grammar-pilot.json";
import { examplePair, theorySentences } from "../src/components/grammar/theory-format";

describe("grammar theory presentation", () => {
  it("keeps every word and punctuation from imported lessons", () => {
    for (const lesson of pilot) for (const section of lesson.theory) {
      expect(theorySentences(section.body).join(" ")).toBe(section.body);
    }
    expect(theorySentences("He often goes. My brother doesn’t play.\nLook! He is leaving.")).toEqual(["He often goes.", "My brother doesn’t play.", "Look!", "He is leaving."]);
    expect(theorySentences(pilot[1].theory[1].body)).toEqual([
      "Dùng am/is/are + động từ -ing cho hành động đang diễn ra.",
      "Những từ như now, at the moment, Look! và Keep silent! thường giúp nhận biết ngữ cảnh.",
    ]);
  });
  it("only turns complete two-sided examples into reveal cards", () => {
    expect(examplePair("one woman → two women")).toEqual({ before: "one woman", after: "two women" });
    for (const value of ["Plain example.", "→ no start", "no end →", "a → b → c"]) expect(examplePair(value)).toBeNull();
  });
});
