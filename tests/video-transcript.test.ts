import { describe, expect, it } from "vitest";
import { parseTranscriptText } from "@/lib/video-transcript";
import { youtubeIdFromUrl } from "@/lib/video-import";

describe("video import helpers", () => {
  it("parses SRT timings and preserves sentence text", () => {
    const result = parseTranscriptText("1\n00:00:01,200 --> 00:00:03,500\nHello <b>there</b>.\n\n2\n00:00:04.000 --> 00:00:06.000\nTry again.");
    expect(result).toMatchObject([{ startSeconds: 1.2, endSeconds: 3.5, en: "Hello there." }, { startSeconds: 4, endSeconds: 6, en: "Try again." }]);
  });

  it("parses labelled English, IPA and Vietnamese lines", () => {
    const result = parseTranscriptText("1\n00:00:01,000 --> 00:00:03,000\nEN: Hello everyone.\nIPA: həˈləʊ ˈevriwʌn\nVI: Xin chào mọi người.\n\n2\n00:00:04,000 --> 00:00:06,000\nEN:\nTry again.\nIPA:\ntraɪ əˈɡen\nVI:\nThử lại.");
    expect(result).toMatchObject([
      { startSeconds: 1, endSeconds: 3, en: "Hello everyone.", ipa: "həˈləʊ ˈevriwʌn", vi: "Xin chào mọi người." },
      { startSeconds: 4, endSeconds: 6, en: "Try again.", ipa: "traɪ əˈɡen", vi: "Thử lại." },
    ]);
  });

  it("accepts YouTube watch, short, and rejects other hosts", () => {
    expect(youtubeIdFromUrl("https://www.youtube.com/watch?v=lkw2PtVpCJM")).toBe("lkw2PtVpCJM");
    expect(youtubeIdFromUrl("https://youtu.be/lkw2PtVpCJM")).toBe("lkw2PtVpCJM");
    expect(youtubeIdFromUrl("https://example.com/watch?v=lkw2PtVpCJM")).toBeNull();
  });
});
