import { getCurrentUser } from "@/lib/access";
import { findPublicPost, parseCommunityPostKind, postTarget } from "@/lib/community-posts";
import { isSameOrigin } from "@/lib/request-security";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Bạn cần đăng nhập để thả tim." }, { status: 401 });

  const url = new URL(request.url);
  const kind = parseCommunityPostKind(url.searchParams.get("kind"));
  const { postId } = await params;
  if (!kind || !postId) return NextResponse.json({ error: "Bài viết không hợp lệ." }, { status: 400 });
  if (!(await findPublicPost(kind, postId))) return NextResponse.json({ error: "Không tìm thấy bài viết." }, { status: 404 });

  const target = postTarget(kind, postId);
  const recipient = kind === "MEMBER"
    ? await prisma.userPost.findFirst({ where: { id: postId, status: "APPROVED", publishedAt: { not: null } }, select: { authorId: true } })
    : null;
  const result = await prisma.$transaction(async (transaction) => {
    const existing = await transaction.postLike.findFirst({ where: { userId: user.id, ...target }, select: { id: true } });
    let liked = false;
    if (existing) {
      await transaction.postLike.delete({ where: { id: existing.id } });
    } else {
      await transaction.postLike.create({ data: { userId: user.id, ...target } });
      liked = true;
    }
    const likeCount = await transaction.postLike.count({ where: target });
    if (recipient) {
      if (liked) {
        await transaction.user.update({ where: { id: recipient.authorId }, data: { heartsReceived: { increment: 1 } } });
      } else {
        await transaction.user.updateMany({ where: { id: recipient.authorId, heartsReceived: { gt: 0 } }, data: { heartsReceived: { decrement: 1 } } });
      }
      const updatedRecipient = await transaction.user.findUnique({ where: { id: recipient.authorId }, select: { heartsReceived: true } });
      return { liked, likeCount, heartsReceived: updatedRecipient?.heartsReceived ?? 0 };
    }
    return { liked, likeCount };
  });

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
