import { getCurrentUser } from "@/lib/access";
import { isSameOrigin } from "@/lib/request-security";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
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

function emailValue(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function validEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function optionalName(value: unknown) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return "__invalid__";
  const name = value.trim();
  return name.length > 100 ? "__invalid__" : name || null;
}

function safeUser(user: Awaited<ReturnType<typeof prisma.user.findUnique<{ where: { id: string }; select: typeof USER_SELECT }>>>) {
  if (!user) return null;
  return user;
}

export async function GET(request: Request) {
  const actor = await getCurrentUser();
  if (!actor) return jsonError("Bạn cần đăng nhập.", 401);
  if (actor.role !== "ADMIN") return jsonError("Chỉ quản trị viên được quản lý tài khoản.", 403);

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const users = await prisma.user.findMany({
    where: {
      role: "LEARNER",
      ...(query
        ? { OR: [{ name: { contains: query, mode: "insensitive" } }, { email: { contains: query, mode: "insensitive" } }] }
        : {}),
    },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    select: USER_SELECT,
  });
  return NextResponse.json({ users: users.map(safeUser), query }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Yêu cầu không hợp lệ.", 403);
  const actor = await getCurrentUser();
  if (!actor) return jsonError("Bạn cần đăng nhập.", 401);
  if (actor.role !== "ADMIN") return jsonError("Chỉ quản trị viên được tạo tài khoản.", 403);

  const body = await request.json().catch(() => null) as { email?: unknown; name?: unknown; password?: unknown } | null;
  const email = emailValue(body?.email);
  const name = optionalName(body?.name);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!validEmail(email)) return jsonError("Email không hợp lệ.", 400);
  if (name === "__invalid__") return jsonError("Tên tối đa 100 ký tự.", 400);
  if (password.length < 8 || password.length > 128) return jsonError("Mật khẩu phải có từ 8 đến 128 ký tự.", 400);

  try {
    const user = await prisma.user.create({
      data: { email, name, passwordHash: await bcrypt.hash(password, 12), role: "LEARNER", isActive: true },
      select: USER_SELECT,
    });
    return NextResponse.json({ user: safeUser(user) }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return jsonError("Email này đã được sử dụng.", 409);
    return jsonError("Không thể tạo tài khoản.", 500);
  }
}
