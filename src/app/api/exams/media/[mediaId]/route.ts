import { getAttemptOwner } from "@/lib/exam-attempt-access";
import { getAuthState } from "@/lib/access";
import { consumeGuestRateLimit, guestRateLimitResponse } from "@/lib/guest-exams";
import { prisma } from "@/lib/prisma";
import { readStoredPaper } from "@/lib/vstep-paper";
import { getObject, headObject } from "@/lib/storage";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
const mimeByExtension: Record<string,string> = { ".mp3":"audio/mpeg", ".wav":"audio/wav", ".m4a":"audio/mp4", ".mp4":"audio/mp4", ".ogg":"audio/ogg", ".webm":"audio/webm" };

export async function GET(request: Request, { params }: { params: Promise<{ mediaId: string }> }) {
  const owner = await getAttemptOwner();
  if (!owner || owner.kind === "invalid") return NextResponse.json({ error: "Phiên đăng nhập hoặc phiên học thử đã hết hạn." }, { status: 401 });
  if (owner.kind === "guest") {
    const rate = await consumeGuestRateLimit(request, "media-read", 120, owner.guestSessionId);
    if (!rate.allowed) return NextResponse.json({ error: "Bạn thao tác quá nhanh. Hãy thử lại sau ít phút." }, { status: 429, headers: guestRateLimitResponse(rate) });
  }
  const { mediaId } = await params;
  if (!/^[a-f0-9-]{36}\.(mp3|wav|m4a|mp4|ogg|webm)$/i.test(mediaId)) return NextResponse.json({ error: "Audio không hợp lệ." }, { status: 400 });
  const authState = await getAuthState();
  const allowedPapers = await prisma.examPaper.findMany({
    where: owner.kind === "guest" ? { status: "PUBLISHED" } : authState.kind === "authenticated" && authState.user.role === "ADMIN" ? {} : { status: "PUBLISHED" },
    select: { sections: true },
  });
  const mediaUrl = `/api/exams/media/${mediaId}`;
  const referenced = allowedPapers.some(({ sections }) => {
    const paper = readStoredPaper(sections);
    return paper && [...paper.listening.parts.map((part) => part.audioUrl), ...paper.speaking.parts.map((part) => part.audioUrl)].includes(mediaUrl);
  });
  if (!referenced) return NextResponse.json({ error: "Audio không thuộc đề bạn được mở." }, { status: 404 });
  const storageKey = `exams/${mediaId}`, extension = path.extname(mediaId).toLowerCase();
  try {
    const metadata = await headObject(storageKey);
    if (!metadata) return NextResponse.json({ error: "Không tìm thấy audio." }, { status: 404 });
    const size = metadata.sizeBytes;
    const range = request.headers.get("range")?.match(/bytes=(\d*)-(\d*)/);
    let start = 0, end = size - 1, status = 200;
    if (range) { start = range[1] ? Number(range[1]) : 0; end = range[2] ? Math.min(Number(range[2]),size-1) : size-1; if (start > end || start >= size) return new NextResponse(null,{status:416,headers:{"Content-Range":`bytes */${size}`}}); status = 206; }
    const object = await getObject(storageKey, { range: { start, end } });
    if (!object) return NextResponse.json({ error: "Không tìm thấy audio." }, { status: 404 });
    return new NextResponse(object.stream, { status, headers: { "Content-Type": mimeByExtension[extension] || metadata.contentType, "Content-Length": String(end - start + 1), "Accept-Ranges":"bytes", ...(status===206?{"Content-Range":`bytes ${start}-${end}/${size}`}:{}) ,"Cache-Control":"private, max-age=3600" } });
  } catch { return NextResponse.json({ error: "Không tìm thấy audio." }, { status: 404 }); }
}
