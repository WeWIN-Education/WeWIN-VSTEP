import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  read: vi.fn(),
  head: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
  find: vi.fn(),
  update: vi.fn(),
  job: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/storage", () => ({
  readObject: mocks.read,
  headObject: mocks.head,
  putObject: mocks.put,
  deleteObject: mocks.del,
  getObject: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    classroomFile: { findUniqueOrThrow: mocks.find, update: mocks.update },
    classroomJob: { upsert: mocks.job },
  },
}));
import { validateFile, fileRange } from "../src/lib/classroom/files";
const png = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489",
  "hex",
);
function fixture(bytes = png, state = "SCAN_PENDING") {
  mocks.del.mockResolvedValue(undefined);
  mocks.find.mockResolvedValue({
    id: "qa-file",
    state,
    name: "sample.png",
    sizeBytes: bytes.length,
    storageKey: "quarantine/qa.png",
  });
  mocks.read.mockResolvedValue(bytes);
  mocks.head.mockResolvedValue(null);
}
afterEach(() => {
  vi.resetAllMocks();
});
it.each(["SCAN_PENDING", "SCAN_FAILED"])(
  "validates a %s upload and queues its preview without antivirus",
  async (state) => {
    fixture(png, state);
    await validateFile("qa-file");
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "qa-file" },
      data: {
        state: "CLEAN",
        cleanKey: "classrooms/clean/qa-file.png",
        mimeType: "image/png",
      },
    });
    expect(mocks.put).toHaveBeenCalledOnce();
    expect(mocks.job).toHaveBeenCalledWith(
      expect.objectContaining({
        create: {
          key: "preview:qa-file",
          kind: "FILE_PREVIEW",
          entityId: "qa-file",
        },
      }),
    );
    expect(mocks.del).toHaveBeenCalledWith("quarantine/qa.png");
  },
);
it("validates full, open-ended and suffix byte ranges without accepting invalid/multiple ranges", () => {
  expect(fileRange("bytes=0-99", 200)).toEqual({ start: 0, end: 99 });
  expect(fileRange("bytes=100-", 200)).toEqual({ start: 100, end: 199 });
  expect(fileRange("bytes=-50", 200)).toEqual({ start: 150, end: 199 });
  expect(fileRange("bytes=-500", 200)).toEqual({ start: 0, end: 199 });
  expect(fileRange("bytes=0-999", 200)).toEqual({ start: 0, end: 199 });
  for (const value of [
    "bytes=200-",
    "bytes=80-79",
    "bytes=-0",
    "bytes=-",
    "bytes=0-1,4-5",
    "bytes=90071992547409999-",
  ])
    expect(fileRange(value, 200)).toBeNull();
});
it("rejects a size mismatch without publishing any bytes", async () => {
  fixture();
  mocks.read.mockResolvedValue(png.subarray(0, -1));
  await validateFile("qa-file");
  expect(mocks.update.mock.calls[0][0].data.state).toBe("REJECTED");
  expect(mocks.put).not.toHaveBeenCalled();
});
it("keeps unreadable uploads unavailable and preserves them for retry", async () => {
  fixture();
  mocks.read.mockRejectedValue(new Error("Storage unavailable"));
  await expect(validateFile("qa-file")).rejects.toThrow("Storage unavailable");
  expect(mocks.update.mock.calls[0][0].data.state).toBe("SCAN_FAILED");
  expect(mocks.put).not.toHaveBeenCalled();
  expect(mocks.del).not.toHaveBeenCalled();
});
it("rejects disguised file content", async () => {
  fixture(Buffer.from("this is an executable pretending to be a PNG"));
  await validateFile("qa-file");
  expect(mocks.update.mock.calls[0][0].data.state).toBe("REJECTED");
  expect(mocks.put).not.toHaveBeenCalled();
});
it.each(["CLEAN", "REJECTED"])(
  "does not process a %s file again",
  async (state) => {
    fixture(png, state);
    await validateFile("qa-file");
    expect(mocks.read).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  },
);
