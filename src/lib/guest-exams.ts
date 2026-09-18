import "server-only";

import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

/**
 * The raw value lives only in the browser cookie. The database stores this
 * digest so a database read alone cannot be used as a guest credential.
 */
export const GUEST_COOKIE_NAME = "wewin_guest_session";
export const GUEST_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
export const GUEST_SESSION_TTL_MS = GUEST_SESSION_TTL_SECONDS * 1000;

const RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT = 120;
let lastGuestCleanupAt = 0;

export function hashGuestToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: GUEST_SESSION_TTL_SECONDS,
  };
}

/** Read the current guest session without creating one or changing cookies. */
export async function getGuestSession() {
  const store = await cookies();
  const rawToken = store.get(GUEST_COOKIE_NAME)?.value;
  if (!rawToken || rawToken.length < 32 || rawToken.length > 256) return null;

  const session = await prisma.guestSession.findUnique({ where: { tokenHash: hashGuestToken(rawToken) } });
  if (!session || session.expiresAt <= new Date()) return null;
  return session;
}

/**
 * Return the current session or atomically create a new random one. This is
 * called only from route handlers, where Next.js permits setting cookies.
 */
export async function ensureGuestSession() {
  const existing = await getGuestSession();
  if (existing) return existing;

  // Keep expired guest rows bounded even when the optional maintenance job is
  // not running. Throttle this cleanup so a burst of first visits stays cheap.
  const cleanupNow = Date.now();
  if (cleanupNow - lastGuestCleanupAt > 5 * 60_000) {
    lastGuestCleanupAt = cleanupNow;
    void prisma.guestSession.deleteMany({ where: { expiresAt: { lt: new Date(cleanupNow) } } }).catch(() => undefined);
  }

  const store = await cookies();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + GUEST_SESSION_TTL_MS);
  const session = await prisma.guestSession.create({ data: { tokenHash: hashGuestToken(token), expiresAt } });
  store.set(GUEST_COOKIE_NAME, token, cookieOptions());
  return session;
}

export function guestSessionCookieOptions() {
  return cookieOptions();
}

/** Hash the request identity before putting it in the persistent limiter key. */
function requestKey(request: Request, bucket: string, subject?: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
  const address = forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
  // Creation is limited by the normalized client address. Once a session
  // exists, bind the bucket to that session as well so autosaves are stable
  // across tabs without allowing user-agent rotation to evade the limiter.
  const identity = createHash("sha256").update(subject ? `${address}|${subject}` : address).digest("hex");
  return `guest:${bucket}:${identity}`;
}

export type GuestRateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

/**
 * A small DB-backed fixed-window limiter for guest endpoints. The update is
 * conditional, so concurrent autosaves cannot increment an already-exhausted
 * bucket. Expired buckets are reset before a new window is created.
 */
export async function consumeGuestRateLimit(
  request: Request,
  bucket: string,
  limit = DEFAULT_RATE_LIMIT,
  subject?: string,
): Promise<GuestRateLimitResult> {
  const key = requestKey(request, bucket, subject);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + RATE_LIMIT_WINDOW_MS);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = await prisma.trialRateLimit.findUnique({ where: { key } });
    if (!current) {
      try {
        await prisma.trialRateLimit.create({ data: { key, count: 1, expiresAt } });
        return { allowed: true, retryAfterSeconds: 0 };
      } catch {
        // Another request won the create race. Read it on the next loop.
        continue;
      }
    }

    if (current.expiresAt <= now) {
      const reset = await prisma.trialRateLimit.updateMany({
        where: { key, expiresAt: { lte: now } },
        data: { count: 1, expiresAt },
      });
      if (reset.count) return { allowed: true, retryAfterSeconds: 0 };
      continue;
    }

    if (current.count >= limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((current.expiresAt.getTime() - now.getTime()) / 1000)),
      };
    }

    const incremented = await prisma.trialRateLimit.updateMany({
      where: { key, count: { lt: limit }, expiresAt: { gt: now } },
      data: { count: { increment: 1 } },
    });
    if (incremented.count) return { allowed: true, retryAfterSeconds: 0 };
  }

  // A burst that keeps losing the short create/update race is treated as a
  // temporary limit hit; callers can retry after a bounded delay.
  return { allowed: false, retryAfterSeconds: 1 };
}

export function guestRateLimitResponse(result: GuestRateLimitResult) {
  return {
    "Retry-After": String(Math.max(1, result.retryAfterSeconds)),
    "Cache-Control": "private, no-store",
  };
}
