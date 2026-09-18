import "server-only";

import { prisma } from "@/lib/prisma";

export type FeedItem = {
  id: string;
  kind: "SYSTEM" | "MEMBER";
  slug: string;
  title: string;
  excerpt: string | null;
  body: string | null;
  imageKey: string | null;
  publishedAt: string;
  author: { id: string; name: string | null } | null;
  likeCount: number;
  commentCount: number;
  viewerLiked: boolean;
};

export type FeedPage = { items: FeedItem[]; nextCursor: string | null };

type Cursor = { date: string; id: string };

function encodeCursor(cursor: Cursor) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeCursor(value: string | undefined): Cursor | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<Cursor>;
    if (typeof parsed.id !== "string" || typeof parsed.date !== "string" || Number.isNaN(Date.parse(parsed.date))) return null;
    return { id: parsed.id, date: parsed.date };
  } catch {
    return null;
  }
}

function beforeCursor(cursor: Cursor | null, field: "publishedAt" | "createdAt") {
  if (!cursor) return {};
  const date = new Date(cursor.date);
  return { OR: [{ [field]: { lt: date } }, { [field]: date, id: { lt: cursor.id } }] };
}

export async function getFeedPage({ cursor, authorId, viewerId, limit = 10 }: { cursor?: string; authorId?: string; viewerId?: string; limit?: number } = {}): Promise<FeedPage> {
  const decoded = decodeCursor(cursor);
  const safeLimit = Math.min(20, Math.max(1, limit));
  const [systemPosts, memberPosts] = await Promise.all([
    prisma.blogPost.findMany({
      where: beforeCursor(decoded, "publishedAt"),
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      take: safeLimit + 1,
      select: { id: true, slug: true, title: true, excerpt: true, body: true, publishedAt: true, _count: { select: { likes: true, comments: true } } },
    }),
    prisma.userPost.findMany({
      where: { status: "APPROVED", publishedAt: { not: null }, ...(authorId ? { authorId } : {}), ...beforeCursor(decoded, "publishedAt") },
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      take: safeLimit + 1,
      select: { id: true, slug: true, title: true, body: true, imageUrl: true, publishedAt: true, author: { select: { id: true, name: true } }, _count: { select: { likes: true, comments: true } } },
    }),
  ]);

  const likedPosts = viewerId && (systemPosts.length || memberPosts.length)
    ? await prisma.postLike.findMany({
        where: {
          userId: viewerId,
          OR: [
            ...(systemPosts.length ? [{ blogPostId: { in: systemPosts.map((post) => post.id) } }] : []),
            ...(memberPosts.length ? [{ userPostId: { in: memberPosts.map((post) => post.id) } }] : []),
          ],
        },
        select: { userPostId: true, blogPostId: true },
      })
    : [];
  const likedKeys = new Set(likedPosts.map((post) => post.blogPostId ? `SYSTEM:${post.blogPostId}` : `MEMBER:${post.userPostId}`));

  const items: FeedItem[] = [
    ...systemPosts.map((post) => ({ id: post.id, kind: "SYSTEM" as const, slug: post.slug, title: post.title, excerpt: post.excerpt, body: post.body, imageKey: null, publishedAt: post.publishedAt.toISOString(), author: null, likeCount: post._count.likes, commentCount: post._count.comments, viewerLiked: likedKeys.has(`SYSTEM:${post.id}`) })),
    ...memberPosts.map((post) => ({ id: post.id, kind: "MEMBER" as const, slug: post.slug, title: post.title || "Bài viết của thành viên", excerpt: post.body.slice(0, 180), body: post.body, imageKey: post.imageUrl, publishedAt: post.publishedAt!.toISOString(), author: post.author, likeCount: post._count.likes, commentCount: post._count.comments, viewerLiked: likedKeys.has(`MEMBER:${post.id}`) })),
  ].sort((left, right) => {
    const time = Date.parse(right.publishedAt) - Date.parse(left.publishedAt);
    return time || right.id.localeCompare(left.id);
  });

  const pageItems = items.slice(0, safeLimit);
  const hasMore = items.length > safeLimit;
  const last = pageItems.at(-1);
  return { items: pageItems, nextCursor: hasMore && last ? encodeCursor({ date: last.publishedAt, id: last.id }) : null };
}
