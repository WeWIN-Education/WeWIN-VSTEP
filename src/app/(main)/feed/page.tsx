import { UserPostComposer } from "@/components/community/UserPostComposer";
import { FeedBoard } from "@/components/community/FeedBoard";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { PageHero } from "@/components/ui/PageHero";
import { getCurrentUser } from "@/lib/access";
import { getFeedPage } from "@/lib/feed";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Cộng đồng | WEWIN EDUCATION" };

export default async function FeedPage() {
  const user = await getCurrentUser();
  const initial = await getFeedPage({ viewerId: user?.id });
  return <div className="mx-auto w-full max-w-[980px] space-y-6"><PageHero eyebrow="CỘNG ĐỒNG WEWIN" title="Feed học tập" description="Đọc bài viết từ WEWIN và những chia sẻ đã được duyệt trong cộng đồng người học VSTEP." />{user ? <UserPostComposer /> : <div className="rounded-2xl border border-border bg-white px-5 py-4 text-sm leading-relaxed text-ink-muted">Đăng nhập để chia sẻ bài viết và tương tác với cộng đồng.</div>}<FeedBoard initial={initial} viewerId={user?.id ?? null} /><SiteFooter /></div>;
}
