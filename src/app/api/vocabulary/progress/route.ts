import { getCurrentUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { reviewSchedule } from "@/lib/vocabulary-study-rules";
import { isSameOrigin } from "@/lib/request-security";

const statuses = new Set(["NEW", "LEARNING", "MASTERED"]);

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  const session = await getCurrentUser();
  if (!session?.id) return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  const body = await request.json() as { entryId?: string; status?: string; note?: string };
  if (!body.entryId || !body.status || !statuses.has(body.status)) return NextResponse.json({ error: "Dữ liệu tiến độ không hợp lệ." }, { status: 400 });
  const entry = await prisma.vocabularyEntry.findUnique({ where: { id: body.entryId }, select: { id: true } });
  if (!entry) {
    const personal = await prisma.personalVocabulary.updateMany({where:{id:body.entryId,userId:session.id},data:{status:body.status as "NEW" | "LEARNING" | "MASTERED"}});
    if (!personal.count) return NextResponse.json({ error: "Không tìm thấy mục từ." }, { status: 404 });
    return NextResponse.json({id:body.entryId,status:body.status});
  }
  const progress = await prisma.vocabularyProgress.upsert({
    where: { userId_entryId: { userId: session.id, entryId: body.entryId } },
    create: { userId: session.id, entryId: body.entryId, status: body.status as "NEW" | "LEARNING" | "MASTERED", note: body.note?.trim() || undefined, reviewCount: 1, lastReviewedAt: new Date(), ...(body.status === "NEW" ? {} : reviewSchedule(body.status === "MASTERED", 0)) },
    update: { status: body.status as "NEW" | "LEARNING" | "MASTERED", note: body.note?.trim() || undefined, reviewCount: { increment: 1 }, lastReviewedAt: new Date(), ...(body.status === "NEW" ? { nextReviewAt: null, intervalStep: 0 } : reviewSchedule(body.status === "MASTERED", 0)) },
  });
  return NextResponse.json({ id: progress.id, status: progress.status, reviewCount: progress.reviewCount });
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  const session = await getCurrentUser();
  if (!session?.id) return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  const body = await request.json() as { entryId?: string };
  if (!body.entryId) return NextResponse.json({ error: "Thiếu mã mục từ." }, { status: 400 });
  const deleted = await prisma.vocabularyProgress.deleteMany({ where: { userId: session.id, entryId: body.entryId } });
  if (!deleted.count) await prisma.personalVocabulary.deleteMany({ where: { id: body.entryId, userId: session.id } });
  return NextResponse.json({ ok: true });
}
