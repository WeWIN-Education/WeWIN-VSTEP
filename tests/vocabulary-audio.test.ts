import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import recordings from "../src/data/vocabulary-audio.json";
import { withVocabularyAudio } from "../src/lib/vocabulary-audio";

it("bundles one playable, versioned file per verified recording and flags the 11 source discrepancies", () => {
  const entries = Object.entries(recordings);
  expect(entries.filter(([code]) => code.startsWith("A1_A2-"))).toHaveLength(1000);
  expect(entries.filter(([code]) => code.startsWith("VSTEP_B1-"))).toHaveLength(234);
  expect(entries.filter(([, [, url]]) => !url)).toHaveLength(11);
  const urls = entries.flatMap(([, [, url]]) => url ? [url] : []);
  expect(new Set(urls).size).toBe(1223);
  for (const url of urls) {
    expect(url).toMatch(/^\/audio\/vocabulary\/(a1-a2|b1)\/\d{3,4}-[a-f0-9]{16}\.mp3$/);
    const bytes = readFileSync(path.join(process.cwd(), "public", url));
    expect(bytes.length).toBeGreaterThan(128);
    expect(bytes.subarray(0, 3).toString()).toBe("ID3");
    expect(url).toContain(createHash("sha256").update(bytes).digest("hex").slice(0, 16));
  }
});

it("uses the matching collection entry, preserves administrator audio and rejects edited or unrelated words", () => {
  const entry = { entryCode: "A1_A2-A1_A2_EDUCATION_001", term: "assignment", audioUrl: null };
  expect(withVocabularyAudio(entry).audioUrl).toMatch(/^\/audio\/vocabulary\/a1-a2\//);
  expect(withVocabularyAudio({ ...entry, term: " Assignment " }).audioUrl).toBe(withVocabularyAudio(entry).audioUrl);
  const custom = { ...entry, audioUrl: "https://example.test/custom.mp3" };
  expect(withVocabularyAudio(custom)).toBe(custom);
  const edited = { ...entry, term: "another word" };
  expect(withVocabularyAudio(edited)).toBe(edited);
  const personal = { term: "assignment", audioUrl: null };
  expect(withVocabularyAudio(personal)).toBe(personal);
  expect(withVocabularyAudio({ ...entry, entryCode: "OTHER-001" }).audioUrl).toBeNull();
});

it("never pronounces airship using the supplied airplane file or silently falls back to a synthetic voice", () => {
  const blocked = { entryCode: "A1_A2-A1_A2_TRANSPORT_004", term: "airship", audioUrl: null };
  expect(withVocabularyAudio(blocked)).toMatchObject({ audioUrl: null, pronunciationUnavailable: true });
  expect(withVocabularyAudio({ ...blocked, term: "airplane" })).toEqual({ ...blocked, term: "airplane" });
  const corrected = { ...blocked, audioUrl: "/corrected-airship.mp3" };
  expect(withVocabularyAudio(corrected)).toBe(corrected);
});
