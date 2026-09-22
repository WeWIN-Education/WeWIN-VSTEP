import { afterEach, expect, it, vi } from "vitest";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { gzipSync, brotliCompressSync } from "node:zlib";

const construction = vi.hoisted(() => vi.fn());
vi.mock("@prisma/client", () => ({ PrismaClient: class {
  constructor(options: unknown) { construction(options); }
  $on() {}
} }));
const globalClient = globalThis as unknown as { prisma?: unknown };
const originalClient = globalClient.prisma;
afterEach(() => { globalClient.prisma = originalClient; vi.unstubAllEnvs(); vi.resetModules(); construction.mockClear(); });

it("reuses Prisma across development reloads and production module imports", async () => {
  vi.stubEnv("PERF_BASELINE_SAMPLE_RATE", "0");
  for (const mode of ["development", "production"]) {
    globalClient.prisma = undefined; construction.mockClear(); vi.resetModules(); vi.stubEnv("NODE_ENV", mode);
    const first = await import("../src/lib/prisma");
    if (mode === "development") vi.resetModules();
    const second = await import("../src/lib/prisma");
    expect(first.prisma).toBe(second.prisma);
    expect(construction).toHaveBeenCalledTimes(1);
    expect(construction.mock.calls[0][0]).not.toHaveProperty("datasourceUrl");
  }
});

it("HTTP probe measures encoded bytes without sending credentials or logging bodies", async () => {
  const payload = Buffer.from(JSON.stringify({ fixture: "PRIVATE-SENTINEL ".repeat(100) }));
  let requests = 0;
  const credentials: unknown[] = [];
  const server = createServer((req, res) => {
    requests++;
    if (req.headers.cookie || req.headers.authorization) credentials.push(req.headers.cookie ?? req.headers.authorization);
    const codec = req.headers["accept-encoding"];
    const body = codec === "gzip" ? gzipSync(payload) : codec === "br" ? brotliCompressSync(payload) : payload;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Vary", "Accept-Encoding");
    res.setHeader("Set-Cookie", "PRIVATE-SENTINEL=secret");
    if (codec !== "identity") res.setHeader("Content-Encoding", codec!);
    res.end(body);
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const { port } = server.address() as { port: number };
    const { stdout } = await promisify(execFile)(process.execPath, ["scripts/phase-5-http.mjs", `http://127.0.0.1:${port}`]);
    const rows = stdout.trim().split("\n").map(line => JSON.parse(line));
    expect(requests).toBe(18);
    expect(credentials).toEqual([]);
    expect(stdout).not.toContain("PRIVATE-SENTINEL");
    for (const row of rows) {
      expect(row.decodedBodyBytes).toBe(payload.length);
      expect(row.headers["cache-control"]).toBe("private, no-store");
      if (row.requestedEncoding !== "identity") expect(row.encodedBodyBytes).toBeLessThan(row.decodedBodyBytes);
    }
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});
