import { afterEach, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import {
  attendanceSummary,
  csvCell,
  decrypt,
  encrypt,
  joinWindow,
  sdkSignature,
  verifyWebhook,
  zoomHostAllowed,
} from "../src/lib/classroom/domain";
afterEach(() => vi.unstubAllEnvs());
it("allows Basic hosts only with an explicit flag in the isolated local environment", () => {
  expect(zoomHostAllowed(true)).toBe(true);
  vi.stubEnv("ZOOM_ALLOW_BASIC_LOCAL", "false");
  expect(zoomHostAllowed(false)).toBe(false);
  vi.stubEnv("ZOOM_ALLOW_BASIC_LOCAL", "true");
  vi.stubEnv(
    "DATABASE_URL",
    "postgresql://qa:qa@localhost:5434/wewin_classroom_test",
  );
  vi.stubEnv("APP_ORIGIN", "http://localhost:3000");
  expect(zoomHostAllowed(false)).toBe(true);
  for (const db of [
    "postgresql://qa:qa@cloud.example:5434/wewin_classroom_test",
    "postgresql://qa:qa@localhost:5432/wewin_classroom_test",
    "postgresql://qa:qa@localhost:5434/wewin",
    "invalid",
  ]) {
    vi.stubEnv("DATABASE_URL", db);
    expect(zoomHostAllowed(false)).toBe(false);
  }
  vi.stubEnv(
    "DATABASE_URL",
    "postgresql://qa:qa@localhost:5434/wewin_classroom_test",
  );
  vi.stubEnv("APP_ORIGIN", "https://we-win-vstep.vercel.app");
  expect(zoomHostAllowed(false)).toBe(false);
});
it("merges reconnect overlaps, clamps to the actual meeting and uses the 80 percent threshold", () => {
  const minute = 60000,
    start = Date.UTC(2026, 9, 6, 3),
    end = start + 60 * minute;
  expect(
    attendanceSummary(
      [
        { start: start - minute, end: start + 30 * minute },
        { start: start + 20 * minute, end: start + 48 * minute },
      ],
      start,
      end,
    ),
  ).toEqual({ minutes: 48, late: false, suggestion: "PRESENT" });
  expect(
    attendanceSummary(
      [{ start: start + 11 * minute, end: end + minute }],
      start,
      end,
    ),
  ).toEqual({ minutes: 49, late: true, suggestion: "LATE" });
  expect(
    attendanceSummary([{ start, end: start + 47 * minute }], start, end)
      .suggestion,
  ).toBe("ABSENT");
  expect(attendanceSummary([], start, start).suggestion).toBe("PENDING");
});
it("checks join window boundaries for learner and staff", () => {
  const start = new Date("2026-10-06T03:00:00Z"),
    end = new Date(+start + 3600000);
  expect(joinWindow(start, end, false, new Date(+start - 600001))).toBe(false);
  expect(joinWindow(start, end, false, new Date(+start - 600000))).toBe(true);
  expect(joinWindow(start, end, true, new Date(+start - 900000))).toBe(true);
  expect(joinWindow(start, end, false, new Date(+end + 900001))).toBe(false);
});
it("checks signed raw webhook bodies and rejects replays and altered bytes", () => {
  const raw = '{"event":"meeting.started"}',
    secret = "test-only",
    now = Date.now(),
    ts = String(Math.floor(now / 1000)),
    signature = `v0=${createHmac("sha256", secret).update(`v0:${ts}:${raw}`).digest("hex")}`;
  expect(verifyWebhook(raw, ts, signature, secret, now)).toBe(true);
  expect(verifyWebhook(raw + " ", ts, signature, secret, now)).toBe(false);
  expect(verifyWebhook(raw, ts, signature, secret, now + 301000)).toBe(false);
  expect(verifyWebhook(raw, ts, signature, "", now)).toBe(false);
});
it("encrypts provider credentials with an authenticated key and refuses corrupted values", () => {
  vi.stubEnv("DATA_ENCRYPTION_KEY", Buffer.alloc(32, 7).toString("base64"));
  const encrypted = encrypt("private passcode");
  expect(encrypted).not.toContain("passcode");
  expect(decrypt(encrypted)).toBe("private passcode");
  const changed = Buffer.from(encrypted, "base64");
  changed[15] ^= 1;
  expect(() => decrypt(changed.toString("base64"))).toThrow();
  vi.stubEnv("DATA_ENCRYPTION_KEY", "");
  expect(() => encrypt("x")).toThrow();
});
it("signs Zoom SDK grants and protects CSV against formula execution", () => {
  vi.stubEnv("ZOOM_MEETING_SDK_KEY", "test-key");
  vi.stubEnv("ZOOM_MEETING_SDK_SECRET", "test-secret");
  const signature = sdkSignature("12345678901", 0),
    [header, payload, mac] = signature.split(".");
  expect(mac).toBe(
    createHmac("sha256", "test-secret")
      .update(`${header}.${payload}`)
      .digest("base64url"),
  );
  const data = JSON.parse(Buffer.from(payload, "base64url").toString());
  expect(data.role).toBe(0);
  expect(data.exp - data.iat).toBeGreaterThanOrEqual(1800);
  expect(csvCell('=HYPERLINK("bad")')).toBe('"\'=HYPERLINK(""bad"")"');
  expect(csvCell(0)).toBe('"0"');
});
