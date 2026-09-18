import { getCurrentUser } from "@/lib/access";
import { findPublicPost, parseCommunityPostKind, postTarget } from "@/lib/community-posts";
import { isSameOrigin } from "@/lib/request-security";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const commentSelect = {
  id: true,
  body: true,
  createdAt: true,
  user: { select: { id: true, name: true } },
} as const;

export async function GET(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const url = new URL(request.url);
  const kind = parseCommunityPostKind(url.searchParams.get("kind"));
  const { postId } = await params;
  if (!kind || !postId) return NextResponse.json({ error: "Bài viết không hợp lệ." }, { status: 400 });
  if (!(await findPublicPost(kind, postId))) return NextResponse.json({ error: "Không tìm thấy bài viết." }, { status: 404 });

  const comments = await prisma.postComment.findMany({
    where: postTarget(kind, postId),
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: 100,
    select: commentSelect,
  });
  return NextResponse.json({ comments: comments.map((comment) => ({ ...comment, createdAt: comment.createdAt.toISOString(), author: comment.user })) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Bạn cần đăng nhập để bình luận." }, { status: 401 });

  const url = new URL(request.url);
  const kind = parseCommunityPostKind(url.searchParams.get("kind"));
  const { postId } = await params;
  if (!kind || !postId) return NextResponse.json({ error: "Bài viết không hợp lệ." }, { status: 400 });
  if (!(await findPublicPost(kind, postId))) return NextResponse.json({ error: "Không tìm thấy bài viết." }, { status: 404 });

  const payload = await request.json().catch(() => null) as { body?: unknown } | null;
  const body = typeof payload?.body === "string" ? payload.body.trim() : "";
  if (!body) return NextResponse.json({ error: "Bình luận không được để trống." }, { status: 400 });
  if (body.length > 1000) return NextResponse.json({ error: "Bình luận tối đa 1.000 ký tự." }, { status: 400 });

  const comment = await prisma.postComment.create({
    data: { userId: user.id, body, ...postTarget(kind, postId) },
    select: commentSelect,
  });
  return NextResponse.json({ comment: { ...comment, createdAt: comment.createdAt.toISOString(), author: comment.user } }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
