import { getCurrentUser } from "@/lib/access";
import { isSameOrigin } from "@/lib/request-security";
import { parseVstepTarget } from "@/lib/gamification";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Bạn cần đăng nhập để cập nhật cài đặt." }, { status: 401 });

  const payload = await request.json().catch(() => null) as { vstepTarget?: unknown } | null;
  const vstepTarget = parseVstepTarget(payload?.vstepTarget);
  if (!vstepTarget) return NextResponse.json({ error: "Mục tiêu VSTEP không hợp lệ." }, { status: 400 });

  await prisma.user.update({ where: { id: user.id }, data: { vstepTarget } });
  return NextResponse.json({ saved: true, vstepTarget }, { headers: { "Cache-Control": "no-store" } });
}
