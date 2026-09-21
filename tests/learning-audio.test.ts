import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { audioRange, MAX_LEARNING_AUDIO_BYTES, validateLearningAudio } from "../src/lib/learning-audio";
import { LEARNING_AUDIO_BUNDLE } from "../src/lib/learning-audio-bundle";
import { parseContentFile } from "../src/lib/learning-content";

it("validates all ten real audio files and their unique document mappings", () => {
  const root = path.join(process.cwd(), "content/vstep");
  const lessons = [...parseContentFile(readFileSync(path.join(root, "ky-nang-vstep-b1-b2-v1.txt"), "utf8"), "SKILL"), ...parseContentFile(readFileSync(path.join(root, "bai-tap-vstep-b1-b2-v1.txt"), "utf8"), "EXERCISE")];
  expect(lessons).toHaveLength(20);
  expect(LEARNING_AUDIO_BUNDLE).toHaveLength(10);
  expect(new Set(LEARNING_AUDIO_BUNDLE.map(e => `${e.kind}/${e.code}`)).size).toBe(10);
  for (const entry of LEARNING_AUDIO_BUNDLE) {
    expect(lessons.filter(item => item.kind === entry.kind && item.code === entry.code)).toHaveLength(1);
    expect(() => validateLearningAudio(entry.file, readFileSync(path.join(root, "audio", entry.file)))).not.toThrow();
    expect(lessons.find(item => item.code === entry.code)?.body).toContain(entry.file);
  }
});
it("rejects oversized, empty, disguised, and path-like MP3 uploads", () => {
  const bytes = Buffer.alloc(128); bytes.write("ID3");
  expect(() => validateLearningAudio("voice.mp3", bytes)).not.toThrow();
  for (const name of ["../voice.mp3", "folder\\voice.mp3", "voice.exe", "a\r\nb.mp3"]) expect(() => validateLearningAudio(name, bytes)).toThrow();
  for (const data of [Buffer.alloc(0), Buffer.alloc(128), Buffer.alloc(MAX_LEARNING_AUDIO_BYTES + 1)]) expect(() => validateLearningAudio("voice.mp3", data)).toThrow();
});
it("supports full, bounded, open and suffix byte requests for audio seeking", () => {
  expect(audioRange(null, 100)).toBeNull();
  expect(audioRange("bytes=10-20", 100)).toEqual({ start: 10, end: 20 });
  expect(audioRange("bytes=10-", 100)).toEqual({ start: 10, end: 99 });
  expect(audioRange("bytes=-20", 100)).toEqual({ start: 80, end: 99 });
  expect(audioRange("bytes=0-200", 100)).toEqual({ start: 0, end: 99 });
  for (const value of ["bytes=100-", "bytes=20-10", "bytes=-0", "bytes=-", "bytes=0-1,3-4", "junk"]) expect(() => audioRange(value, 100)).toThrow();
});
