import { PostModerationPanel } from "@/components/manage/PostModerationPanel";
import { PageHero } from "@/components/ui/PageHero";
import { getCurrentUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function ManagePostsPage() {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login?callbackUrl=/manage/posts");
  if (actor.role !== "ADMIN") redirect("/dashboard");
  const posts = await prisma.userPost.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { author: { select: { id: true, name: true, email: true } } } });
  return <div className="mx-auto w-full max-w-[1120px] space-y-6"><PageHero eyebrow="QUẢN TRỊ CỘNG ĐỒNG" title="Duyệt bài viết user" description="Duyệt, từ chối hoặc ẩn bài trước khi nội dung xuất hiện trên feed công khai." stats={[{ label: "Đang chờ", value: String(posts.filter((post) => post.status === "PENDING").length) }, { label: "Tổng bài", value: String(posts.length) }]} /><PostModerationPanel initialPosts={posts.map((post) => ({ ...post, createdAt: post.createdAt.toISOString(), publishedAt: post.publishedAt?.toISOString() || null }))} /></div>;
}
