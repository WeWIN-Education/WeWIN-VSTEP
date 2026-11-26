import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

function hubKeyConfigured(): string | null {
  const key = process.env.WEWIN_HUB_API_KEY?.trim();
  return key && key.length >= 16 ? key : null;
}

/**
 * Constant-time Bearer check for WeWIN Admin Panel BFF.
 * Returns machine codes: HUB_KEY_NOT_CONFIGURED | UNAUTHORIZED.
 */
export function authorizeHubBearer(request: Request):
  | { ok: true }
  | { ok: false; status: 401 | 503; code: "HUB_KEY_NOT_CONFIGURED" | "UNAUTHORIZED" } {
  const expected = hubKeyConfigured();
  if (!expected) return { ok: false, status: 503, code: "HUB_KEY_NOT_CONFIGURED" };
  const auth = request.headers.get("authorization") || "";
  const match = /^Bearer\s+(\S+)$/i.exec(auth);
  if (!match) return { ok: false, status: 401, code: "UNAUTHORIZED" };
  const a = createHash("sha256").update(match[1]).digest();
  const b = createHash("sha256").update(expected).digest();
  if (!timingSafeEqual(a, b)) return { ok: false, status: 401, code: "UNAUTHORIZED" };
  return { ok: true };
}
