import { getAttemptOwner, ownerWhere } from "@/lib/exam-attempt-access";
import { consumeGuestRateLimit, guestRateLimitResponse } from "@/lib/guest-exams";
import { getObject, headObject } from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function rangeHeader(value: string | null, size: number) {
  const match = value?.match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return null;
  const start = match[1] ? Number(match[1]) : 0;
  const end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start > end || start >= size) return null;
  return { start, end };
}
export async function GET(request: Request, { params }: { params: Promise<{ attemptId: string; partId: string }> }) {
  const owner = await getAttemptOwner();
  if (!owner || owner.kind === "invalid") return NextResponse.json({ error: "Phiên đăng nhập hoặc phiên học thử đã hết hạn." }, { status: 401 });
  if (owner.kind === "guest") {
    const rate = await consumeGuestRateLimit(request, "speaking-read", 180, owner.guestSessionId);
    if (!rate.allowed) return NextResponse.json({ error: "Bạn thao tác quá nhanh. Hãy thử lại sau ít phút." }, { status: 429, headers: guestRateLimitResponse(rate) });
  }
  const { attemptId, partId } = await params;
  const recording = await prisma.examRecording.findFirst({ where: { attemptId, partId, status: "SAVED", attempt: ownerWhere(owner) }, select: { storageKey: true, mimeType: true } });
  if (!recording) return new NextResponse("Not found", { status: 404 });

  const stored = await headObject(recording.storageKey);
  if (!stored) return new NextResponse("Not found", { status: 404 });
  const requested = rangeHeader(request.headers.get("range"), stored.sizeBytes);
  if (request.headers.has("range") && !requested) return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${stored.sizeBytes}` } });
  const range = requested || { start: 0, end: stored.sizeBytes - 1 };
  const object = await getObject(recording.storageKey, requested ? { range } : undefined);
  if (!object) return new NextResponse("Not found", { status: 404 });
  const partial = Boolean(requested);
  return new NextResponse(object.stream, {
    status: partial ? 206 : 200,
    headers: {
      "Content-Type": recording.mimeType,
      "Content-Length": String(range.end - range.start + 1),
      "Accept-Ranges": "bytes",
      ...(partial ? { "Content-Range": `bytes ${range.start}-${range.end}/${stored.sizeBytes}` } : {}),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
