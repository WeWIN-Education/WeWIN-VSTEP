import { getCurrentUser } from "@/lib/access";
import { isSameOrigin } from "@/lib/request-security";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { deleteObject } from "@/lib/storage";
import { revalidatePath } from "next/cache";

export async function DELETE(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  const actor = await getCurrentUser();
  if (actor?.role !== "ADMIN") return NextResponse.json({ error: "Chỉ quản trị viên được xóa bài." }, { status: 403 });
  const { postId } = await params;
  const post = await prisma.userPost.findUnique({ where: { id: postId } });
  if (!post) return NextResponse.json({ error: "Không tìm thấy bài." }, { status: 404 });
  const body = await request.json().catch(() => null);
  if (body?.confirmation !== (post.title || "Không có tiêu đề")) return NextResponse.json({ error: "Tên xác nhận chưa đúng." }, { status: 400 });
  await prisma.userPost.delete({ where: { id: postId } });
  let warning: string | undefined;
  if (post.imageUrl && /^[a-f0-9-]{36}\.(jpg|jpeg|png|webp)$/i.test(post.imageUrl)) {
    try { await deleteObject(`posts/${post.imageUrl}`); } catch { warning = "Đã xóa bài và tương tác; ảnh chưa dọn được khỏi storage."; }
  }
  revalidatePath("/community"); revalidatePath("/blog");
  return NextResponse.json({ ok: true, warning });
}

const statuses = ["DRAFT", "PENDING", "APPROVED", "REJECTED", "HIDDEN"] as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  if (actor.role !== "ADMIN") return NextResponse.json({ error: "Chỉ admin được duyệt bài." }, { status: 403 });
  const { postId } = await params;
  const body = await request.json().catch(() => null) as { status?: unknown; rejectionReason?: unknown; title?: unknown; body?: unknown } | null;
  if (body && (body.title !== undefined || body.body !== undefined)) {
    if (typeof body.title !== "string" || body.title.length > 160 || typeof body.body !== "string" || !body.body.trim() || body.body.length > 10000) return NextResponse.json({ error: "Tiêu đề hoặc nội dung không hợp lệ." }, { status: 400 });
    const result = await prisma.userPost.updateMany({ where: { id: postId }, data: { title: body.title.trim() || null, body: body.body.trim() } });
    if (!result.count) return NextResponse.json({ error: "Không tìm thấy bài." }, { status: 404 });
    revalidatePath("/blog"); revalidatePath("/community");
    return NextResponse.json({ ok: true });
  }
  const status = typeof body?.status === "string" && statuses.includes(body.status as (typeof statuses)[number]) ? body.status as (typeof statuses)[number] : null;
  if (!status) return NextResponse.json({ error: "Trạng thái không hợp lệ." }, { status: 400 });
  const post = await prisma.userPost.update({ where: { id: postId }, data: { status, reviewedById: actor.id, reviewedAt: new Date(), publishedAt: status === "APPROVED" ? new Date() : null, rejectionReason: status === "REJECTED" && typeof body?.rejectionReason === "string" ? body.rejectionReason.trim().slice(0, 500) : null }, include: { author: { select: { id: true, name: true, email: true } } } }).catch(() => null);
  if (!post) return NextResponse.json({ error: "Không tìm thấy bài viết." }, { status: 404 });
  return NextResponse.json({ post }, { headers: { "Cache-Control": "private, no-store" } });
}
