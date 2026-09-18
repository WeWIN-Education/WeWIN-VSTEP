import { getCurrentUser } from "@/lib/access";
import { isSameOrigin } from "@/lib/request-security";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const statuses = ["DRAFT", "PENDING", "APPROVED", "REJECTED", "HIDDEN"] as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  if (actor.role !== "ADMIN") return NextResponse.json({ error: "Chỉ admin được duyệt bài." }, { status: 403 });
  const { postId } = await params;
  const body = await request.json().catch(() => null) as { status?: unknown; rejectionReason?: unknown } | null;
  const status = typeof body?.status === "string" && statuses.includes(body.status as (typeof statuses)[number]) ? body.status as (typeof statuses)[number] : null;
  if (!status) return NextResponse.json({ error: "Trạng thái không hợp lệ." }, { status: 400 });
  const post = await prisma.userPost.update({ where: { id: postId }, data: { status, reviewedById: actor.id, reviewedAt: new Date(), publishedAt: status === "APPROVED" ? new Date() : null, rejectionReason: status === "REJECTED" && typeof body?.rejectionReason === "string" ? body.rejectionReason.trim().slice(0, 500) : null }, include: { author: { select: { id: true, name: true, email: true } } } }).catch(() => null);
  if (!post) return NextResponse.json({ error: "Không tìm thấy bài viết." }, { status: 404 });
  return NextResponse.json({ post }, { headers: { "Cache-Control": "private, no-store" } });
}
