import { getCurrentUser } from "@/lib/access";
import { isSameOrigin } from "@/lib/request-security";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ paperId: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  if (actor.role !== "ADMIN") return NextResponse.json({ error: "Chỉ quản trị viên được thay đổi trạng thái đề." }, { status: 403 });
  const { paperId } = await params;
  const body = await request.json().catch(() => ({})) as { published?: unknown };
  if (typeof body.published !== "boolean") return NextResponse.json({ error: "Trạng thái không hợp lệ." }, { status: 400 });
  const paper = await prisma.examPaper.findUnique({ where: { id: paperId }, select: { id: true, status: true, programme: true, title: true } });
  if (!paper) return NextResponse.json({ error: "Không tìm thấy đề." }, { status: 404 });
  const status = body.published ? "PUBLISHED" : "SAMPLE";
  const updated = await prisma.examPaper.update({ where: { id: paper.id }, data: { status }, select: { id: true, status: true, title: true } });
  return NextResponse.json({ ok: true, ...updated, message: body.published ? "Đề đã được đưa lên lại." : "Đề đã được gỡ khỏi danh sách học viên. Bài làm cũ vẫn được giữ." });
}
