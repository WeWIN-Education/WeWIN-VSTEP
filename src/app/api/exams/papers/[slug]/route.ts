import { getAuthState } from "@/lib/access";
import { getExamForRun } from "@/lib/exam-server";
import { NextResponse } from "next/server";
import type { ExamCatalog } from "@prisma/client";
import { consumeGuestRateLimit, guestRateLimitResponse } from "@/lib/guest-exams";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const headers = { "Cache-Control": "private, no-store" };
  const auth = await getAuthState();
  if (auth.kind === "invalid") return NextResponse.json({ error: "Phiên đăng nhập đã hết hạn." }, { status: 401, headers });
  if (auth.kind === "anonymous") {
    const rate = await consumeGuestRateLimit(request, "paper-read", 120);
    if (!rate.allowed) return NextResponse.json({ error: "Bạn thao tác quá nhanh. Hãy thử lại sau." }, { status: 429, headers: { ...headers, ...guestRateLimitResponse(rate) } });
  }
  const catalog = new URL(request.url).searchParams.get("catalog") || "";
  if (!["LISTENING", "READING", "WRITING", "SPEAKING"].includes(catalog)) return NextResponse.json({ error: "Kỹ năng không hợp lệ." }, { status: 400, headers });
  const access = auth.kind === "authenticated" ? { kind: auth.user.role === "ADMIN" ? "admin" as const : "learner" as const, userId: auth.user.id } : { kind: "guest" as const };
  const exam = await getExamForRun("vstep", (await params).slug, access, catalog as ExamCatalog);
  return exam ? NextResponse.json({ content: exam.content }, { headers }) : NextResponse.json({ error: "Không tìm thấy nội dung đề." }, { status: 404, headers });
}
