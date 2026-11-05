import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import library from "../src/data/grammar-topics.json";
import pilot from "../src/data/grammar-pilot.json";
import catalog from "../src/data/grammar-catalog.json";
import audit from "../docs/grammar-source-audit.json";
import { gradeQuestion, gradeSet, publicQuestion, validateGrammarContent, type GrammarQuestion, type GrammarAnswer } from "../src/lib/grammar-rules";
import { theorySentences } from "../src/components/grammar/theory-format";

const contents = library.map(validateGrammarContent);
const answer = (q: GrammarQuestion): GrammarAnswer => {
  if (q.type === "WORD_ORDER") return { tokenIds: [...q.tokens!].sort((a, b) => q.accepted![0].indexOf(a.text) - q.accepted![0].indexOf(b.text)).map(t => t.id) };
  if (q.type === "ERROR_CORRECTION") return { indexes: q.errorIndexes!, correction: q.accepted![0] };
  if (q.type === "PASSAGE_CLOZE") return { blanks: Object.fromEntries(q.blanks!.map(b => [b.id, b.accepted[0]])) };
  return q.correctOption ?? q.accepted![0];
};
describe("complete grammar library", () => {
  it("covers all 40 topics once across six groups with bounded complete exercises", () => {
    expect(contents.map(t => t.number)).toEqual(Array.from({ length: 40 }, (_, i) => i + 1));
    expect(new Set(contents.map(t => t.slug)).size).toBe(40);
    expect(catalog.groups).toHaveLength(6);
    expect(catalog.topics).toHaveLength(40);
    expect(contents.flatMap(t => t.sets)).toHaveLength(80);
    expect(contents.flatMap(t => t.sets.flatMap(s => s.questions))).toHaveLength(400);
    for (const content of contents) {
      expect(catalog.topics.find(t => t.number === content.number)).toMatchObject({ slug: content.slug, title: content.title });
      expect(catalog.groups.some(g => g.id === catalog.topics.find(t => t.number === content.number)!.group)).toBe(true);
      expect(Buffer.byteLength(JSON.stringify(content))).toBeLessThan(128000);
      for (const set of content.sets) expect(set.questions).toHaveLength(5);
      for (const section of content.theory) expect(theorySentences(section.body).join(" ")).toBe(section.body);
    }
  });
  it("retains the exact three pilot versions, preserving their existing progress keys", () => {
    for (const value of pilot) {
      const original = validateGrammarContent(value), current = contents.find(t => t.slug === original.slug)!;
      expect(current).toEqual(original);
      const version = (t: unknown) => createHash("sha256").update(JSON.stringify(t)).digest("hex");
      expect(version(current)).toBe(version(original));
    }
  });
  it("grades every full exercise and all declared text variants, rejects empty text, and redacts keys", () => {
    for (const content of contents) for (const set of content.sets) {
      expect(gradeSet(set.questions, Object.fromEntries(set.questions.map(q => [q.id, answer(q)]))).passed).toBe(true);
      for (const q of set.questions) {
        const result = gradeQuestion(q, answer(q));
        expect(result.correct, q.id).toBe(result.total);
        if (q.type === "FILL_BLANK" || q.type === "SENTENCE_REWRITE") {
          for (const variant of q.accepted!) expect(gradeQuestion(q, variant).correct, q.id).toBe(1);
          expect(gradeQuestion(q, " ").correct).toBe(0);
        }
        const visible = publicQuestion(q);
        for (const field of ["accepted", "correctOption", "errorIndexes", "explanation"]) expect(visible).not.toHaveProperty(field);
        for (const blank of visible.blanks ?? []) expect(blank).not.toHaveProperty("accepted");
      }
    }
  });
  it("records source provenance and known corrections instead of copying broken keys", () => {
    expect(audit).toHaveLength(37);
    for (const item of audit) {
      const topic = contents.find(t => t.number === item.number)!;
      expect(topic.source.file).toBe(item.worksheet);
      expect(topic.source.sha256).toBe(item.sha256);
      expect(item.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(item.keyFiles.length).toBeGreaterThan(0);
      for (const q of topic.sets.flatMap(s => s.questions)) expect(q.source).toMatch(/đoạn \d/);
    }
    const question = (n: number, id: string) => contents.find(t => t.number === n)!.sets.flatMap(s => s.questions).find(q => q.id === id)!;
    expect(gradeQuestion(question(2, "t02-q04"), "well").correct).toBe(0);
    expect(gradeQuestion(question(10, "t10-q03"), "carefully").correct).toBe(0);
    expect(gradeQuestion(question(27, "t27-q08"), "would visited").correct).toBe(0);
  });
});
