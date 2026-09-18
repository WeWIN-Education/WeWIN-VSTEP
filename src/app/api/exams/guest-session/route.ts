import { consumeGuestRateLimit, ensureGuestSession, guestRateLimitResponse } from "@/lib/guest-exams";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const rate = await consumeGuestRateLimit(request, "session-bootstrap", 10);
  if (!rate.allowed) return NextResponse.json({ error: "Bạn thao tác quá nhanh. Hãy thử lại sau ít phút." }, { status: 429, headers: guestRateLimitResponse(rate) });
  const session = await ensureGuestSession();
  return NextResponse.json({ expiresAt: session.expiresAt.toISOString() }, { headers: { "Cache-Control": "private, no-store" } });
}
