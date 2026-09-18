import { getCurrentUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  if (actor.role !== "ADMIN") return NextResponse.json({ error: "Chỉ admin được xem bài chờ duyệt." }, { status: 403 });
  const posts = await prisma.userPost.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { author: { select: { id: true, name: true, email: true } } } });
  return NextResponse.json({ posts }, { headers: { "Cache-Control": "private, no-store" } });
}
