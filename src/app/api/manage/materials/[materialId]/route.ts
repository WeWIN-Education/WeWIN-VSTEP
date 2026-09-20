import { getCurrentUser } from "@/lib/access";
import { isSameOrigin } from "@/lib/request-security";
import { prisma } from "@/lib/prisma";
import { MATERIAL_LEVELS, MATERIAL_SKILLS } from "@/lib/learning-materials";
import { deleteObject } from "@/lib/storage";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

type Context = { params: Promise<{ materialId: string }> };
async function mutate(request: Request, context: Context, remove: boolean) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  const actor = await getCurrentUser();
  if (actor?.role !== "ADMIN") return NextResponse.json({ error: "Chỉ quản trị viên được quản lý tài liệu." }, { status: 403 });
  const { materialId } = await context.params;
  const item = await prisma.learningMaterial.findUnique({ where: { id: materialId } });
  if (!item) return NextResponse.json({ error: "Tài liệu không còn tồn tại." }, { status: 404 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Thông tin không hợp lệ." }, { status: 400 });
  try {
    let warning: string | undefined;
    if (remove) {
      if (body.confirmation !== item.title) return NextResponse.json({ error: "Tên xác nhận chưa đúng." }, { status: 400 });
      await prisma.learningMaterial.delete({ where: { id: materialId } });
      try { await deleteObject(item.storageName.includes("/") ? item.storageName : `materials/${item.storageName}`); }
      catch { warning = "Đã xóa bản ghi; chưa dọn được file lưu trữ. Cần kiểm tra storage."; }
    } else {
      if (typeof body.title !== "string" || !body.title.trim() || body.title.length > 160 || typeof body.description !== "string" || body.description.length > 1000 || !MATERIAL_SKILLS.includes(body.skill) || !MATERIAL_LEVELS.includes(body.level) || !["true", "false"].includes(body.published)) return NextResponse.json({ error: "Kiểm tra tên, mô tả, kỹ năng, trình độ và trạng thái." }, { status: 400 });
      await prisma.learningMaterial.update({ where: { id: materialId }, data: { title: body.title.trim(), description: body.description.trim() || null, skill: body.skill, level: body.level === "ALL" ? null : body.level, published: body.published === "true" } });
    }
    revalidatePath("/materials"); revalidatePath("/manage/materials");
    return NextResponse.json({ ok: true, warning });
  } catch { return NextResponse.json({ error: "Không thể cập nhật tài liệu." }, { status: 500 }); }
}
export const PATCH = (request: Request, context: Context) => mutate(request, context, false);
export const DELETE = (request: Request, context: Context) => mutate(request, context, true);
