import { getCurrentUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { isSameOrigin } from "@/lib/request-security";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

type Context = { params: Promise<{ paperId: string }> };
async function mutate(request: Request, context: Context, remove: boolean) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  const actor = await getCurrentUser();
  if (actor?.role !== "ADMIN") return NextResponse.json({ error: "Chỉ quản trị viên được quản lý đề." }, { status: 403 });
  const { paperId } = await context.params;
  const body = await request.json().catch(() => null);
  try {
    const paper = await prisma.examPaper.findUnique({ where: { id: paperId } });
    if (!paper) return NextResponse.json({ error: "Không tìm thấy đề." }, { status: 404 });
    if (remove) {
      if (body?.confirmation !== paper.title) return NextResponse.json({ error: "Tên xác nhận chưa đúng." }, { status: 400 });
      // Never cascade-delete learner work as a side effect of removing shared content.
      const deleted = await prisma.examPaper.deleteMany({ where: { id: paperId, attempts: { none: {} } } });
      if (!deleted.count) return NextResponse.json({ error: "Đề đã có lượt làm. Hãy dùng nút Ẩn để giữ lịch sử học viên." }, { status: 409 });
    } else {
      if (typeof body?.title !== "string" || !body.title.trim() || body.title.length > 160 || typeof body.subtitle !== "string" || body.subtitle.length > 1000) return NextResponse.json({ error: "Tên hoặc mô tả không hợp lệ." }, { status: 400 });
      await prisma.examPaper.update({ where: { id: paperId }, data: { title: body.title.trim(), subtitle: body.subtitle.trim() || null } });
    }
    revalidatePath("/manage/exams/import"); revalidatePath("/exam/vstep"); revalidatePath(`/exam/vstep/${paper.slug}`);
    return NextResponse.json({ ok: true, warning: remove ? "Đã xóa bản ghi đề. Audio nguồn được giữ để tránh xóa nhầm file đang dùng chung." : undefined });
  } catch { return NextResponse.json({ error: "Không thể cập nhật đề." }, { status: 500 }); }
}
export const PATCH = (request: Request, context: Context) => mutate(request, context, false);
export const DELETE = (request: Request, context: Context) => mutate(request, context, true);
