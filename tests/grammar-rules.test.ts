import { describe, expect, it } from "vitest";
import pilot from "../src/data/grammar-pilot.json";
import { gradeQuestion, gradeSet, publicQuestion, validateGrammarContent, type GrammarQuestion, QUESTION_TYPES } from "../src/lib/grammar-rules";

const contents = pilot.map(validateGrammarContent);
const find = (id: string) => contents.flatMap(c => c.sets.flatMap(s => s.questions)).find(q => q.id === id)!;
const writing: GrammarQuestion = { id: "rewrite", type: "SENTENCE_REWRITE", prompt: "Rewrite", source: "Unit test", explanation: "Explicit alternatives", accepted: ["He is known by everyone.", "He's known by everyone."], ignoreCase: true, ignoreFinalPunctuation: true };

describe("grammar content and grading", () => {
  it("validates the 3 source-based topics and covers seven interaction types", () => {
    expect(contents).toHaveLength(3);
    expect(contents.flatMap(c => c.sets)).toHaveLength(6);
    const questions = contents.flatMap(c => c.sets.flatMap(s => s.questions));
    expect(questions).toHaveLength(30);
    expect(new Set(questions.map(q => q.type))).toEqual(new Set(QUESTION_TYPES));
  });
  it("does not send answer keys or explanations to the exercise client", () => {
    const publicData = contents.flatMap(c => c.sets.flatMap(s => s.questions.map(publicQuestion)));
    const raw = JSON.stringify(publicData);
    for (const field of ["accepted", "correctOption", "errorIndexes", "explanation"]) expect(raw).not.toContain(`"${field}"`);
  });
  it("rejects empty keys, duplicate IDs, invalid options and missing cloze placeholders", () => {
    for (const mutate of [
      (c: typeof contents[0]) => { c.sets[0].questions[0].accepted = [""]; },
      (c: typeof contents[0]) => { c.sets[0].questions[1].id = c.sets[0].questions[0].id; },
      (c: typeof contents[0]) => { c.sets[1].questions[0].correctOption = "no-such-option"; },
    ]) { const value = structuredClone(contents[0]); mutate(value); expect(() => validateGrammarContent(value)).toThrow(); }
    const invalid = structuredClone(pilot[1]); invalid.sets[0].questions[4].prompt = "No placeholders";
    expect(() => validateGrammarContent(invalid)).toThrow("Ô trống");
  });
  it("accepts approved contractions without guessing ambiguous 's or 'd", () => {
    expect(gradeQuestion(writing, "He's known by everyone.").correct).toBe(1);
    const had = { ...writing, accepted: ["He had studied before dinner.", "He'd studied before dinner."] };
    expect(gradeQuestion(had, "He’d studied before dinner.").correct).toBe(1);
    expect(gradeQuestion(had, "He would studied before dinner.").correct).toBe(0);
    expect(gradeQuestion(writing, "He isn't known by everyone.").correct).toBe(0);
    expect(gradeQuestion(writing, "").correct).toBe(0);
  });
  it("only ignores case and final punctuation when the question permits it", () => {
    expect(gradeQuestion(writing, "  he   is known by everyone ").correct).toBe(1);
    expect(gradeQuestion({ ...writing, ignoreCase: false, ignoreFinalPunctuation: false }, "he is known by everyone").correct).toBe(0);
    expect(gradeQuestion(writing, "He, is known by everyone.").correct).toBe(0);
  });
  it("accepts the remainder or complete rewrite and rejects the original duplicate object", () => {
    const q = find("relative-1");
    expect(gradeQuestion(q, "that I've ever met.").correct).toBe(1);
    expect(gradeQuestion(q, "She is the most intelligent woman that I have ever met.").correct).toBe(1);
    expect(gradeQuestion(q, "that I've ever met this woman.").correct).toBe(0);
  });
  it("scores each cloze blank and rejects unknown blanks", () => {
    const q = find("tense-5");
    expect(gradeQuestion(q, { blanks: { walk: "walks", go: "is going" } })).toMatchObject({ correct: 2, total: 2 });
    expect(gradeQuestion(q, { blanks: { walk: "walk", go: "is going" } }).correct).toBe(1);
    expect(() => gradeQuestion(q, { blanks: { intruder: "yes" } })).toThrow();
  });
  it("uses positions for repeated error tokens and unique IDs for repeated word chips", () => {
    const error = { ...find("noun-9"), errorTokens: ["was", "was"], errorIndexes: [1] };
    expect(gradeQuestion(error, { indexes: [0], correction: "teeth" }).correct).toBe(0);
    expect(gradeQuestion(error, { indexes: [1], correction: "teeth" }).correct).toBe(1);
    const order: GrammarQuestion = { ...find("noun-10"), tokens: [{ id: "a", text: "the" }, { id: "b", text: "the" }], accepted: ["the the"] };
    expect(gradeQuestion(order, { tokenIds: ["a", "b"] }).correct).toBe(1);
    expect(() => gradeQuestion(order, { tokenIds: ["a", "a"] })).toThrow("Thẻ từ");
    expect(gradeQuestion(order, { tokenIds: ["a"] }).correct).toBe(0);
  });
  it("requires an actual response, rejects foreign IDs and bounds input", () => {
    expect(() => gradeSet([find("noun-1")], { "noun-1": "   " })).toThrow("trả lời");
    expect(() => gradeSet([find("tense-5")], { "tense-5": { blanks: { walk: "", go: "" } } })).toThrow("trả lời");
    expect(() => gradeSet([find("noun-1")], { foreign: "people" })).toThrow();
    expect(() => gradeQuestion(writing, "a".repeat(501))).toThrow();
  });
  it("requires exact 80 percent and never rounds a failed result into a pass", () => {
    const qs = Array.from({ length: 49 }, (_, i) => ({ ...find("noun-1"), id: `q-${i}` }));
    const answers = Object.fromEntries(qs.map((q, i) => [q.id, i < 39 ? "people" : "wrong"]));
    expect(gradeSet(qs, answers)).toMatchObject({ correct: 39, total: 49, passed: false });
    answers[qs[39].id] = "people";
    expect(gradeSet(qs, answers).passed).toBe(true);
  });
});
