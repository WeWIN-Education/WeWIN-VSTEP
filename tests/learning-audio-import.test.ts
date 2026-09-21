import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ marker: vi.fn(), mark: vi.fn(), createMany: vi.fn(), find: vi.fn(), update: vi.fn(), lock: vi.fn(), transaction: vi.fn(), disconnect: vi.fn(), put: vi.fn(), head: vi.fn(), del: vi.fn() }));
vi.mock("@prisma/client", () => ({ PrismaClient: class {
  learningContentImport = { findUnique: mocks.marker };
  $transaction = mocks.transaction;
  $disconnect = mocks.disconnect;
} }));
vi.mock("../src/lib/storage", () => ({ putObject: mocks.put, headObject: mocks.head, deleteObject: mocks.del }));
import { importLearningAudioBundle } from "../scripts/import-learning-audio-bundle";
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("VERCEL_ENV", "production"); vi.stubEnv("BLOB_READ_WRITE_TOKEN", "unit-test-placeholder");
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  mocks.marker.mockResolvedValue(null);
  mocks.createMany.mockResolvedValue({ count: 20 });
  mocks.find.mockImplementation(async ({ where }) => ({ id: where.kind_code.code, audioKey: null }));
  mocks.update.mockResolvedValue({ count: 1 });
  mocks.del.mockResolvedValue(undefined);
  mocks.head.mockImplementation(async key => ({ sizeBytes: mocks.put.mock.calls.find(([k]) => k === key)?.[1].length }));
  mocks.transaction.mockImplementation(async fn => fn({ $executeRaw: mocks.lock, learningContentImport: { findUnique: mocks.marker, create: mocks.mark }, learningContent: { createMany: mocks.createMany, findUniqueOrThrow: mocks.find, updateMany: mocks.update } }));
});
afterEach(() => { process.exitCode = 0; vi.unstubAllEnvs(); vi.restoreAllMocks(); });
it("imports 20 hidden entries and all ten audio attachments without overwriting content", async () => {
  await importLearningAudioBundle();
  expect(mocks.createMany.mock.calls[0][0].skipDuplicates).toBe(true);
  expect(mocks.createMany.mock.calls[0][0].data).toHaveLength(20);
  expect(mocks.createMany.mock.calls[0][0].data.every((x: { published: boolean }) => !x.published)).toBe(true);
  expect(mocks.put).toHaveBeenCalledTimes(10);
  expect(mocks.update).toHaveBeenCalledTimes(10);
  expect(mocks.mark).toHaveBeenCalledTimes(1);
  expect(mocks.del).not.toHaveBeenCalled();
});
it("skips preview builds and never resurrects an already imported bundle", async () => {
  vi.stubEnv("VERCEL_ENV", "preview"); await importLearningAudioBundle();
  expect(mocks.marker).not.toHaveBeenCalled();
  vi.stubEnv("VERCEL_ENV", "production"); mocks.marker.mockResolvedValue({ id: "done" });
  await importLearningAudioBundle();
  expect(mocks.transaction).not.toHaveBeenCalled(); expect(mocks.put).not.toHaveBeenCalled();
});
it("keeps administrator audio and recognizes a concurrent deploy marker", async () => {
  mocks.find.mockResolvedValue({ id: "existing", audioKey: "existing.mp3" });
  await importLearningAudioBundle(); expect(mocks.put).not.toHaveBeenCalled();
  mocks.transaction.mockClear(); mocks.mark.mockClear();
  mocks.marker.mockResolvedValueOnce(null).mockResolvedValue({ id: "other-deployment" });
  await importLearningAudioBundle(); expect(mocks.mark).not.toHaveBeenCalled();
});
it("cleans new uploads and fails deployment when attachment fails before commit", async () => {
  mocks.update.mockRejectedValue(new Error("database unavailable"));
  await importLearningAudioBundle();
  expect(process.exitCode).toBe(1);
  expect(mocks.del).toHaveBeenCalledWith(mocks.put.mock.calls[0][0]);
  expect(mocks.mark).not.toHaveBeenCalled();
});
it("preserves audio when commit outcome cannot be established", async () => {
  mocks.update.mockRejectedValue(new Error("interrupted"));
  mocks.marker.mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockRejectedValue(new Error("offline"));
  await importLearningAudioBundle();
  expect(mocks.del).not.toHaveBeenCalled(); expect(process.exitCode).toBe(1);
});
