import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), rate: vi.fn(), papers: vi.fn(), head: vi.fn(), get: vi.fn() }));
vi.mock("@/lib/access", () => ({ getAuthState: mocks.auth }));
vi.mock("@/lib/guest-exams", () => ({ consumeGuestRateLimit: mocks.rate, guestRateLimitResponse: () => ({}) }));
vi.mock("@/lib/prisma", () => ({ prisma: { examPaper: { findMany: mocks.papers } } }));
vi.mock("@/lib/storage", () => ({ headObject: mocks.head, getObject: mocks.get }));
import { GET } from "../src/app/api/exams/media/[mediaId]/route";
const id = "2260cd07-452d-4d2f-b66e-5d1273c28d59.mp3";
const url = `/api/exams/media/${id}`;
const request = () => GET(new Request(`http://localhost${url}`, { headers: { range: "bytes=0-3" } }), { params: Promise.resolve({ mediaId: id }) });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ kind: "anonymous" });
  mocks.rate.mockResolvedValue({ allowed: true });
  mocks.papers.mockResolvedValue([{ sections: { version: 1, slug: "qa", title: "QA", listening: { parts: [{ audioUrl: url }] }, reading: {}, writing: [], speaking: { parts: [] } } }]);
  mocks.head.mockResolvedValue({ sizeBytes: 4, contentType: "audio/mpeg" });
  mocks.get.mockImplementation(async () => ({ stream: new ReadableStream({ start(c) { c.enqueue(new Uint8Array([1, 2, 3, 4])); c.close(); } }) }));
});
it("serves published sample audio to a fresh visitor without a trial cookie, preserving ranges", async () => {
  const response = await request();
  expect(response.status).toBe(206);
  expect(response.headers.get("Content-Range")).toBe("bytes 0-3/4");
  expect((await response.arrayBuffer()).byteLength).toBe(4);
  expect(mocks.papers.mock.lastCall![0].where).toEqual({ status: "PUBLISHED" });
});
it("does not read files unreferenced by published papers", async () => {
  mocks.papers.mockResolvedValue([]);
  expect((await request()).status).toBe(404);
  expect(mocks.head).not.toHaveBeenCalled();
});
it("denies locked/stale sessions instead of treating them as visitors", async () => {
  mocks.auth.mockResolvedValue({ kind: "invalid" });
  expect((await request()).status).toBe(401);
  expect(mocks.papers).not.toHaveBeenCalled();
});
it("rate limits anonymous audio before storage reads", async () => {
  mocks.rate.mockResolvedValue({ allowed: false });
  expect((await request()).status).toBe(429);
  expect(mocks.head).not.toHaveBeenCalled();
});
