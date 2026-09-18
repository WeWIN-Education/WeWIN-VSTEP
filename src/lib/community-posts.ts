import "server-only";

import { prisma } from "@/lib/prisma";

export const COMMUNITY_POST_KINDS = ["MEMBER", "SYSTEM"] as const;
export type CommunityPostKind = (typeof COMMUNITY_POST_KINDS)[number];

export function parseCommunityPostKind(value: string | null): CommunityPostKind | null {
  return value === "MEMBER" || value === "SYSTEM" ? value : null;
}

export function postTarget(kind: CommunityPostKind, postId: string) {
  return kind === "MEMBER"
    ? { userPostId: postId, blogPostId: null }
    : { userPostId: null, blogPostId: postId };
}

export async function findPublicPost(kind: CommunityPostKind, postId: string) {
  if (kind === "MEMBER") {
    return prisma.userPost.findFirst({
      where: { id: postId, status: "APPROVED", publishedAt: { not: null } },
      select: { id: true },
    });
  }

  return prisma.blogPost.findUnique({ where: { id: postId }, select: { id: true } });
}
