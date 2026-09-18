import { getCurrentUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await getCurrentUser();
  if (!session?.id) return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  const body = await request.json() as { term?: string; ipa?: string; meaningVi?: string; exampleEn?: string; note?: string; tags?: string };
  const term = body.term?.trim();
  const meaningVi = body.meaningVi?.trim();
  if (!term || !meaningVi) return NextResponse.json({ error: "Từ/cụm từ và nghĩa là bắt buộc." }, { status: 400 });
  const item = await prisma.personalVocabulary.create({ data: { userId: session.id, term, ipa: body.ipa?.trim() || undefined, meaningVi, exampleEn: body.exampleEn?.trim() || undefined, note: body.note?.trim() || undefined, tags: body.tags?.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 5) ?? [] } });
  return NextResponse.json({ id: item.id });
}

export async function DELETE(request: Request) {
  const session = await getCurrentUser();
  if (!session?.id) return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  const body = await request.json() as { id?: string };
  if (!body.id) return NextResponse.json({ error: "Thiếu mã mục từ." }, { status: 400 });
  await prisma.personalVocabulary.deleteMany({ where: { id: body.id, userId: session.id } });
  return NextResponse.json({ ok: true });
}
