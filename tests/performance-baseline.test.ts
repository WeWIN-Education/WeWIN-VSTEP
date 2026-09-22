import { afterEach, describe, expect, it, vi } from "vitest";
import { baselineMeasurement, baselineSampleRate, recordBaseline, summarizeBaseline } from "../src/lib/performance-baseline";

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("performance baseline", () => {
  it("is opt-in and rejects invalid sampling rates", () => {
    for (const value of ["", "0", "-1", "2", "NaN", "Infinity"]) {
      vi.stubEnv("PERF_BASELINE_SAMPLE_RATE", value);
      expect(baselineSampleRate()).toBe(0);
    }
    vi.stubEnv("PERF_BASELINE_SAMPLE_RATE", "0.1");
    expect(baselineSampleRate()).toBe(0.1);
  });
  it("logs only allowlisted labels and finite nonnegative durations", () => {
    vi.stubEnv("PERF_BASELINE_SAMPLE_RATE", "1");
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    recordBaseline("grading.examiner", 123);
    recordBaseline("SELECT secret FROM users", 12);
    recordBaseline("db.query", NaN);
    expect(log.mock.calls).toEqual([[JSON.stringify({ event: "performance_baseline", metric: "grading.examiner", durationMs: 123 })]]);
    expect(baselineMeasurement("db.query", -1)).toBeNull();
  });
  it("samples without breaking application behavior when logging fails", () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => { throw new Error("unavailable"); });
    vi.stubEnv("PERF_BASELINE_SAMPLE_RATE", "0");
    recordBaseline("db.query", 1);
    expect(log).not.toHaveBeenCalled();
    vi.stubEnv("PERF_BASELINE_SAMPLE_RATE", "0.5");
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    recordBaseline("db.query", 1);
    expect(log).not.toHaveBeenCalled();
    vi.mocked(Math.random).mockReturnValue(0.1);
    expect(() => recordBaseline("db.query", 1)).not.toThrow();
    expect(log).toHaveBeenCalledTimes(1);
  });
  it("reports nearest-rank percentiles and flags small samples", () => {
    const values = Array.from({ length: 100 }, (_, i) => 100 - i);
    expect(summarizeBaseline(values)).toEqual({ samples: 100, p50Ms: 50, p95Ms: 95, maxMs: 100, insufficientSamples: false });
    expect(values[0]).toBe(100);
    expect(summarizeBaseline([NaN, -1])).toBeNull();
    expect(summarizeBaseline([10])?.insufficientSamples).toBe(true);
  });
  it("wires Prisma events without logging SQL or query parameters", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PERF_BASELINE_SAMPLE_RATE", "1");
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const listeners: Array<(event: { duration: number; query: string; params: string }) => void> = [];
    vi.doMock("@prisma/client", () => ({ PrismaClient: class {
      $on(_name: string, listener: typeof listeners[number]) { listeners.push(listener); }
    } }));
    try {
      await import("../src/lib/prisma");
      expect(listeners).toHaveLength(1);
      listeners[0]({ duration: 17, query: "SELECT confidential", params: "private-answer" });
      expect(log.mock.calls).toEqual([[JSON.stringify({ event: "performance_baseline", metric: "db.query", durationMs: 17 })]]);
    } finally {
      vi.doUnmock("@prisma/client");
      vi.resetModules();
    }
  });
});
