import { afterEach, expect, it, vi } from "vitest";
import { createServer, type Server } from "node:net";
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
import { scanFile, fileRange } from "../src/lib/classroom/files";
let server: Server | undefined;
const png = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489",
  "hex",
);
async function scanner(reply: string) {
  server = createServer((socket) => {
    let bytes = Buffer.alloc(0);
    socket.on("data", (chunk) => {
      bytes = Buffer.concat([bytes, chunk]);
      if (bytes.length < 10) return;
      expect(bytes.subarray(0, 10).toString()).toBe("zINSTREAM\0");
      let offset = 10;
      while (bytes.length >= offset + 4) {
        const length = bytes.readUInt32BE(offset);
        if (!length) {
          socket.end(reply + "\0");
          return;
        }
        if (bytes.length < offset + 4 + length) return;
        offset += 4 + length;
      }
    });
  });
  await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
  vi.stubEnv("CLAMAV_HOST", "127.0.0.1");
  vi.stubEnv(
    "CLAMAV_PORT",
    String((server.address() as { port: number }).port),
  );
}
function fixture(bytes = png) {
  mocks.del.mockResolvedValue(undefined);
  mocks.find.mockResolvedValue({
    id: "qa-file",
    state: "SCAN_PENDING",
    name: "sample.png",
    sizeBytes: bytes.length,
    storageKey: "quarantine/qa.png",
  });
  mocks.read.mockResolvedValue(bytes);
  mocks.head.mockResolvedValue(null);
}
afterEach(async () => {
  if (server)
    await new Promise<void>((resolve) => server!.close(() => resolve()));
  server = undefined;
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});
it("moves a verified MIME and scanner-approved file to private clean storage", async () => {
  fixture();
  await scanner("stream: OK");
  await scanFile("qa-file");
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
});
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
it("rejects an infected file without publishing any bytes", async () => {
  fixture();
  await scanner("stream: Eicar-Test-Signature FOUND");
  await scanFile("qa-file");
  expect(mocks.update.mock.calls[0][0].data.state).toBe("REJECTED");
  expect(mocks.put).not.toHaveBeenCalled();
});
it("keeps scanner errors unavailable rather than marking a file clean", async () => {
  fixture();
  await scanner("stream: scan error ERROR");
  await expect(scanFile("qa-file")).rejects.toThrow();
  expect(mocks.update.mock.calls[0][0].data.state).toBe("SCAN_FAILED");
  expect(mocks.put).not.toHaveBeenCalled();
  expect(mocks.del).not.toHaveBeenCalled();
});
it("rejects disguised file content before contacting a scanner", async () => {
  fixture(Buffer.from("this is an executable pretending to be a PNG"));
  await scanFile("qa-file");
  expect(mocks.update.mock.calls[0][0].data.state).toBe("REJECTED");
  expect(mocks.put).not.toHaveBeenCalled();
});
