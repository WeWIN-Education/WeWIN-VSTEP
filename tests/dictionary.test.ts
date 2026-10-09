import { afterEach, beforeEach, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ shared: vi.fn(), personal: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: { vocabularyEntry: { findFirst: db.shared }, personalVocabulary: { findFirst: db.personal } } }));
import { lookupDictionary } from "../src/lib/dictionary";
const entry = { term: "education", meaningVi: "giáo dục", ipa: "ˌedʒuˈkeɪʃn", partOfSpeech: "noun", exampleEn: null, exampleVi: null, audioUrl: null };
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("GOOGLE_TRANSLATE_API_KEY", ""); db.shared.mockResolvedValue(null); db.personal.mockResolvedValue(null); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it("uses shared vocabulary without an external service", async () => {
  db.shared.mockResolvedValue(entry);
  expect(await lookupDictionary({ text: " Education ", direction: "auto", userId: "learner" })).toMatchObject({ translation: "giáo dục", sourceLanguage: "en", entry });
  expect(db.personal).not.toHaveBeenCalled();
});
it("uses only the current learner's personal entries and looks up Vietnamese by meaning", async () => {
  db.personal.mockResolvedValue(entry);
  expect(await lookupDictionary({ text: "education", direction: "en-vi", userId: "learner" })).toMatchObject({ translation: "giáo dục" });
  expect(db.personal.mock.lastCall![0].where).toEqual({ userId: "learner", term: { equals: "education", mode: "insensitive" } });
  expect(await lookupDictionary({ text: "giáo dục", direction: "vi-en", userId: "learner" })).toMatchObject({ translation: "education", sourceLanguage: "vi" });
  expect(db.personal.mock.lastCall![0].where).toEqual({ userId: "learner", meaningVi: { equals: "giáo dục", mode: "insensitive" } });
});
it("finds a single Vietnamese meaning in personal vocabulary", async () => {
  db.personal.mockResolvedValue({ ...entry, term: "learn", meaningVi: "học" });
  expect(await lookupDictionary({ text: "học", direction: "auto", userId: "learner" })).toMatchObject({ translation: "learn" });
  expect(db.personal.mock.lastCall![0].where).toEqual({ userId: "learner", meaningVi: { equals: "học", mode: "insensitive" } });
});
it("reports missing translation configuration and rejects blank input", async () => {
  await expect(lookupDictionary({ text: "education", direction: "auto", userId: "learner" })).rejects.toMatchObject({ code: "UNAVAILABLE", message: expect.stringContaining("ngoài kho") });
  await expect(lookupDictionary({ text: "   ", direction: "auto", userId: "learner" })).rejects.toMatchObject({ code: "INVALID_INPUT" });
});
it("translates sentences with the configured service and returns a clear network failure", async () => {
  vi.stubEnv("GOOGLE_TRANSLATE_API_KEY", "test");
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { translations: [{ translatedText: "Tôi học tiếng Anh." }] } })));
  vi.stubGlobal("fetch", fetcher);
  expect(await lookupDictionary({ text: "I learn English.", direction: "en-vi", userId: "learner" })).toMatchObject({ translation: "Tôi học tiếng Anh.", entry: null });
  expect(JSON.parse(fetcher.mock.lastCall![1].body)).toMatchObject({ source: "en", target: "vi", format: "text" });
  expect(fetcher.mock.lastCall![1].signal).toBeInstanceOf(AbortSignal);
  fetcher.mockRejectedValue(new Error("network"));
  await expect(lookupDictionary({ text: "Tôi học tiếng Anh.", direction: "auto", userId: "learner" })).rejects.toMatchObject({ code: "FAILED", message: expect.stringContaining("không phản hồi") });
});
