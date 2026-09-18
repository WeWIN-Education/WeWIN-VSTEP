import { Card } from "@/components/ui/Card";
import { PostInteractions } from "@/components/community/PostInteractions";
import { PageHero } from "@/components/ui/PageHero";
import { getCurrentUser } from "@/lib/access";
import { getFeedPage } from "@/lib/feed";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = { title: "Trang thành viên | WEWIN EDUCATION" };

export default async function MemberPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const user = await prisma.user.findFirst({ where: { id: userId, isActive: true }, select: { id: true, name: true } });
  if (!user) notFound();
  const viewer = await getCurrentUser();
  const feed = await getFeedPage({ authorId: user.id, viewerId: viewer?.id, limit: 20 });
  return <div className="mx-auto w-full max-w-[980px] space-y-6"><PageHero eyebrow="THÀNH VIÊN WEWIN" title={user.name || "Thành viên WEWIN"} description="Các bài viết đã được duyệt và chia sẻ công khai của thành viên này." stats={[{ label: "Bài đã duyệt", value: String(feed.items.length) }]} />{feed.items.length ? <div className="space-y-4">{feed.items.map((item) => <Card key={item.id} padding="lg"><p className="text-xs text-ink-muted">{new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(item.publishedAt))}</p><h2 className="mt-2 text-xl font-extrabold text-ink">{item.title}</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-muted">{item.body || item.excerpt}</p>{item.imageKey ? <Image src={`/api/posts/media/${encodeURIComponent(item.imageKey)}`} alt="Ảnh bài viết" width={1200} height={800} sizes="(max-width: 980px) 100vw, 980px" className="mt-4 max-h-80 w-full rounded-2xl object-cover" /> : null}<PostInteractions item={item} viewerId={viewer?.id ?? null} /></Card>)}</div> : <Card padding="lg" className="text-center text-sm text-ink-muted">Thành viên này chưa có bài viết đã duyệt.</Card>}</div>;
}
