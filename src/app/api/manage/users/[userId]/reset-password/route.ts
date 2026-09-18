import { getCurrentUser } from "@/lib/access";
import { isSameOrigin } from "@/lib/request-security";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  if (!isSameOrigin(request)) return errorResponse("Yêu cầu không hợp lệ.", 403);
  const actor = await getCurrentUser();
  if (!actor) return errorResponse("Bạn cần đăng nhập.", 401);
  if (actor.role !== "ADMIN") return errorResponse("Chỉ quản trị viên được đặt lại mật khẩu.", 403);
  const { userId } = await params;
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
  if (!target || target.role !== "LEARNER") return errorResponse("Không tìm thấy tài khoản học viên.", 404);

  const body = await request.json().catch(() => null) as { password?: unknown } | null;
  const password = typeof body?.password === "string" ? body.password : "";
  if (password.length < 8 || password.length > 128) return errorResponse("Mật khẩu phải có từ 8 đến 128 ký tự.", 400);
  await prisma.user.update({ where: { id: target.id }, data: { passwordHash: await bcrypt.hash(password, 12), sessionVersion: { increment: 1 } } });
  return NextResponse.json({ ok: true, message: "Mật khẩu đã được đặt lại. Phiên đăng nhập cũ đã bị thu hồi." });
}
