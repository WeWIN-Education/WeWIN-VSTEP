import { describe, expect, it } from "vitest";
import { validateSubmission } from "../src/lib/exam-submission";
import { isSameOrigin } from "../src/lib/request-security";
import type { VstepTest1Public } from "../src/lib/vstep-test-1-public";

const paper: VstepTest1Public = {
  slug: "test-paper",
  title: "Test paper",
  subtitle: "",
  target: "B1",
  listening: {
    instructions: "",
    parts: [{ id: "listening-1", title: "Part 1", audioUrl: "", durationSeconds: 1, instructions: "", questions: [{ id: "q1", number: 1, prompt: "", options: ["A", "B"] }] }],
  },
  reading: { instructions: "", passages: [] },
  writing: [],
  speaking: { parts: [{ id: "speaking-1", title: "Part 1", prompt: "", questions: [], preparationSeconds: 1, speakingSeconds: 1 }] },
};

const storedRecording = {
  "speaking-1": {
    startedAt: "2026-09-18T00:00:00.000Z",
    stoppedAt: "2026-09-18T00:00:02.000Z",
    durationSeconds: 2,
    storageKey: "exam-recordings/attempt-1/speaking-1-abc.webm",
    sizeBytes: 2048,
    mimeType: "audio/webm",
  },
};

describe("Speaking submission validation", () => {
  it("accepts a server-confirmed Blob recording", () => {
    expect(validateSubmission({ recordings: storedRecording }, {}, {}, paper, "attempt-1").recordings).toEqual(storedRecording);
  });

  it("rejects a recording from another attempt", () => {
    expect(() => validateSubmission({ recordings: { ...storedRecording, "speaking-1": { ...storedRecording["speaking-1"], storageKey: "exam-recordings/other/speaking-1.webm" } } }, {}, {}, paper, "attempt-1")).toThrow("Bản ghi âm không hợp lệ");
  });

  it("rejects an unknown Speaking part", () => {
    expect(() => validateSubmission({ recordings: { "speaking-9": storedRecording["speaking-1"] } }, {}, {}, paper, "attempt-1")).toThrow("Bản ghi âm không hợp lệ");
  });
});

describe("same-origin mutation guard", () => {
  it("accepts same-origin requests and rejects explicit cross-origin requests", () => {
    expect(isSameOrigin(new Request("https://wewin.example/api/test", { headers: { origin: "https://wewin.example" } }))).toBe(true);
    expect(isSameOrigin(new Request("https://wewin.example/api/test", { headers: { origin: "https://attacker.example" } }))).toBe(false);
  });
});
