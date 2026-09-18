import { getCurrentUser } from "@/lib/access";
import { isSameOrigin } from "@/lib/request-security";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { attempts: true, vocabularyProgress: true } },
} as const;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function publicUser(user: Awaited<ReturnType<typeof prisma.user.findUnique<{ where: { id: string }; select: typeof USER_SELECT }>>>) {
  if (!user) return null;
  return user;
}

function validEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  if (!isSameOrigin(request)) return jsonError("Yêu cầu không hợp lệ.", 403);
  const actor = await getCurrentUser();
  if (!actor) return jsonError("Bạn cần đăng nhập.", 401);
  if (actor.role !== "ADMIN") return jsonError("Chỉ quản trị viên được sửa tài khoản.", 403);
  const { userId } = await params;

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, isActive: true } });
  if (!target || target.role !== "LEARNER") return jsonError("Không tìm thấy tài khoản học viên.", 404);
  const body = await request.json().catch(() => null) as { email?: unknown; name?: unknown; isActive?: unknown } | null;
  if (!body || (body.email === undefined && body.name === undefined && body.isActive === undefined)) return jsonError("Không có thay đổi để lưu.", 400);

  const data: { email?: string; name?: string | null; isActive?: boolean; sessionVersion?: { increment: number } } = {};
  if (body.email !== undefined) {
    if (typeof body.email !== "string") return jsonError("Email không hợp lệ.", 400);
    const email = body.email.trim().toLowerCase();
    if (!validEmail(email)) return jsonError("Email không hợp lệ.", 400);
    data.email = email;
  }
  if (body.name !== undefined) {
    if (body.name !== null && typeof body.name !== "string") return jsonError("Tên không hợp lệ.", 400);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length > 100) return jsonError("Tên tối đa 100 ký tự.", 400);
    data.name = name || null;
  }
  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") return jsonError("Trạng thái tài khoản không hợp lệ.", 400);
    data.isActive = body.isActive;
    if (body.isActive !== target.isActive) data.sessionVersion = { increment: 1 };
  }

  try {
    const updated = await prisma.user.update({ where: { id: target.id }, data, select: USER_SELECT });
    return NextResponse.json({ user: publicUser(updated) });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return jsonError("Email này đã được sử dụng.", 409);
    return jsonError("Không thể cập nhật tài khoản.", 500);
  }
}
