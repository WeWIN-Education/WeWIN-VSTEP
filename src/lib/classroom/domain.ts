import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export class ClassroomError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export type TabAttentionState = "VISIBLE" | "AWAY_PENDING" | "AWAY" | "UNKNOWN";
export function tabAttentionState(
  visible: boolean | null,
  changedAt: Date | null,
  signalAt: Date | null,
  now: Date,
): TabAttentionState {
  if (visible === null || !changedAt || !signalAt || +now - +signalAt > 90000)
    return "UNKNOWN";
  if (visible) return "VISIBLE";
  return +now - +changedAt >= 30000 ? "AWAY" : "AWAY_PENDING";
}
export function requireValue(
  condition: unknown,
  message: string,
  status = 400,
): asserts condition {
  if (!condition) throw new ClassroomError(message, status);
}
export function zoomHostAllowed(licensed: boolean) {
  if (licensed) return true;
  if (process.env.ZOOM_ALLOW_BASIC === "true") return true;
  if (process.env.ZOOM_ALLOW_BASIC_LOCAL !== "true") return false;
  try {
    const db = new URL(process.env.DATABASE_URL || "");
    return (
      db.hostname === "localhost" &&
      db.port === "5434" &&
      db.pathname === "/wewin_classroom_test" &&
      process.env.APP_ORIGIN === "http://localhost:3000"
    );
  } catch {
    return false;
  }
}
export function text(value: unknown, max = 200, required = true) {
  requireValue(typeof value === "string", "Dữ liệu văn bản không hợp lệ.");
  const result = value.trim();
  requireValue(
    (!required || result.length > 0) && result.length <= max,
    `Nội dung tối đa ${max} ký tự.`,
  );
  return result;
}
export function integer(value: unknown, min: number, max: number) {
  requireValue(
    typeof value === "number" &&
      Number.isInteger(value) &&
      value >= min &&
      value <= max,
    `Giá trị phải từ ${min} đến ${max}.`,
  );
  return value;
}
export function date(value: unknown) {
  requireValue(
    typeof value === "string" && /^\d{4}-\d\d-\d\dT/.test(value),
    "Thời gian không hợp lệ.",
  );
  const result = new Date(value);
  requireValue(Number.isFinite(result.getTime()), "Thời gian không hợp lệ.");
  return result;
}
export function choice(value: unknown, options: string[]) {
  requireValue(
    typeof value === "string" && options.includes(value),
    "Lựa chọn không hợp lệ.",
  );
  return value;
}
function encryptionKey() {
  const key = Buffer.from(process.env.DATA_ENCRYPTION_KEY || "", "base64");
  requireValue(key.length === 32, "Chưa cấu hình khóa mã hóa dữ liệu.", 503);
  return key;
}
export function encrypt(value: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  return Buffer.concat([
    iv,
    cipher.update(value, "utf8"),
    cipher.final(),
    cipher.getAuthTag(),
  ]).toString("base64");
}
export function decrypt(value: string) {
  const bytes = Buffer.from(value, "base64"),
    cipher = createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      bytes.subarray(0, 12),
    );
  cipher.setAuthTag(bytes.subarray(-16));
  return Buffer.concat([
    cipher.update(bytes.subarray(12, -16)),
    cipher.final(),
  ]).toString("utf8");
}
export function sdkSignature(meeting: string, role: number, now = Date.now()) {
  const key = process.env.ZOOM_MEETING_SDK_KEY,
    secret = process.env.ZOOM_MEETING_SDK_SECRET;
  requireValue(key && secret, "Chưa cấu hình Zoom Meeting SDK.", 503);
  const iat = Math.floor(now / 1000) - 30,
    exp = iat + 3600;
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      appKey: key,
      sdkKey: key,
      mn: meeting,
      role,
      iat,
      exp,
      tokenExp: exp,
    }),
  ).toString("base64url");
  return `${header}.${payload}.${createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url")}`;
}
export function verifyWebhook(
  raw: string,
  timestamp: string,
  signature: string,
  secret: string,
  now = Date.now(),
) {
  if (
    !secret ||
    !/^\d{10}$/.test(timestamp) ||
    Math.abs(now / 1000 - Number(timestamp)) > 300
  )
    return false;
  const expected = `v0=${createHmac("sha256", secret).update(`v0:${timestamp}:${raw}`).digest("hex")}`;
  return (
    signature.length === expected.length &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  );
}
export function joinWindow(
  startsAt: Date,
  endsAt: Date,
  staff: boolean,
  now = new Date(),
) {
  return (
    now.getTime() >= startsAt.getTime() - (staff ? 15 : 10) * 60000 &&
    now.getTime() <= endsAt.getTime() + 15 * 60000
  );
}
export function attendanceSummary(
  intervals: { start: number; end: number }[],
  start: number,
  end: number,
) {
  if (!(end > start)) return { minutes: 0, late: false, suggestion: "PENDING" };
  const sorted = intervals
    .map((i) => ({
      start: Math.max(start, i.start),
      end: Math.min(end, i.end),
    }))
    .filter((i) => i.end > i.start)
    .sort((a, b) => a.start - b.start);
  let covered = 0,
    right = start;
  for (const i of sorted) {
    covered += Math.max(0, i.end - Math.max(right, i.start));
    right = Math.max(right, i.end);
  }
  const late = sorted.length > 0 && sorted[0].start - start > 10 * 60000;
  return {
    minutes: covered / 60000,
    late,
    suggestion:
      covered >= (end - start) * 0.8 ? (late ? "LATE" : "PRESENT") : "ABSENT",
  };
}
export function csvCell(value: unknown) {
  let s = value == null ? "" : String(value);
  if (/^[=+@\-\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replaceAll('"', '""')}"`;
}
