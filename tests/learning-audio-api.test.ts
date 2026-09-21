import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ actor: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn(), put: vi.fn(), del: vi.fn(), get: vi.fn(), head: vi.fn() }));
vi.mock("@/lib/access", () => ({ getCurrentUser: mocks.actor }));
vi.mock("@/lib/prisma", () => ({ prisma: { learningContent: mocks } }));
vi.mock("@/lib/storage", () => ({ isBlobStorageEnabled: () => true, putObject: mocks.put, deleteObject: mocks.del, headObject: mocks.head, getObject: mocks.get }));
import { PUT, DELETE } from "../src/app/api/manage/learning-content/[id]/audio/route";
import { GET } from "../src/app/api/learning-content/[id]/audio/route";
const context = { params: Promise.resolve({ id: "lesson" }) };
const date = new Date("2026-09-21T00:00:00Z");
const request = (method: string, headers: Record<string, string> = {}, body?: Buffer) => new Request("https://example.com/api/manage/learning-content/lesson/audio", { method, headers: { origin: "https://example.com", "if-match": date.toISOString(), "x-file-name": "voice.mp3", ...headers }, body: body ? new Uint8Array(body) : undefined });
const mp3 = Buffer.alloc(128); mp3.write("ID3");
beforeEach(() => {
  vi.resetAllMocks();
  mocks.actor.mockResolvedValue({ role: "ADMIN" });
  mocks.findUnique.mockResolvedValue({ id: "lesson", audioKey: "learning-audio/old.mp3", updatedAt: date, published: false });
  mocks.updateMany.mockResolvedValue({ count: 1 });
  mocks.head.mockResolvedValue({ sizeBytes: 128 });
  mocks.get.mockImplementation(async () => ({ stream: new ReadableStream({ start(c) { c.enqueue(mp3); c.close(); } }) }));
});
it("protects mutations and private playback from guests and learners", async () => {
  mocks.actor.mockResolvedValue(null);
  expect((await PUT(request("PUT"), context)).status).toBe(401);
  expect((await GET(request("GET"), context)).status).toBe(401);
  mocks.actor.mockResolvedValue({ role: "LEARNER" });
  expect((await DELETE(request("DELETE"), context)).status).toBe(403);
  expect((await GET(request("GET"), context)).status).toBe(404);
  expect(mocks.get).not.toHaveBeenCalled();
  expect(mocks.put).not.toHaveBeenCalled();
});
it("rejects cross-origin requests and stale editors before uploading", async () => {
  expect((await PUT(request("PUT", { origin: "https://evil.example" }, mp3), context)).status).toBe(403);
  expect((await PUT(request("PUT", { "if-match": "old" }, mp3), context)).status).toBe(409);
  expect(mocks.put).not.toHaveBeenCalled();
});
it("attaches replacement audio before deleting the previous object", async () => {
  expect((await PUT(request("PUT", {}, mp3), context)).status).toBe(200);
  expect(mocks.put).toHaveBeenCalledWith(expect.stringMatching(/^learning-audio\/lesson\/.*\.mp3$/), mp3, "audio/mpeg");
  expect(mocks.updateMany).toHaveBeenCalledWith({ where: { id: "lesson", updatedAt: date }, data: { audioKey: expect.any(String), audioName: "voice.mp3" } });
  expect(mocks.del).toHaveBeenCalledWith("learning-audio/old.mp3");
  expect(mocks.updateMany.mock.invocationCallOrder[0]).toBeLessThan(mocks.del.mock.invocationCallOrder[0]);
});
it("cleans only the new upload after a concurrent edit", async () => {
  mocks.updateMany.mockResolvedValue({ count: 0 });
  expect((await PUT(request("PUT", {}, mp3), context)).status).toBe(409);
  expect(mocks.del).toHaveBeenCalledWith(mocks.put.mock.calls[0][0]);
  expect(mocks.del).not.toHaveBeenCalledWith("learning-audio/old.mp3");
});
it("removes audio from database and storage", async () => {
  expect((await DELETE(request("DELETE"), context)).status).toBe(200);
  expect(mocks.updateMany).toHaveBeenCalledWith({ where: { id: "lesson", updatedAt: date }, data: { audioKey: null, audioName: null } });
  expect(mocks.del).toHaveBeenCalledWith("learning-audio/old.mp3");
});
it("does not attach a non-MP3 file", async () => {
  expect((await PUT(request("PUT", {}, Buffer.alloc(128)), context)).status).toBe(400);
  expect(mocks.put).not.toHaveBeenCalled();
});
it("serves published audio with private range responses and rejects invalid ranges", async () => {
  mocks.actor.mockResolvedValue({ role: "LEARNER" });
  mocks.findUnique.mockResolvedValue({ audioKey: "key", published: true });
  const response = await GET(request("GET", { range: "bytes=0-9" }), context);
  expect(response.status).toBe(206);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("content-range")).toBe("bytes 0-9/128");
  expect(mocks.get).toHaveBeenCalledWith("key", { range: { start: 0, end: 9 } });
  expect((await GET(request("GET", { range: "bytes=200-" }), context)).status).toBe(416);
});
