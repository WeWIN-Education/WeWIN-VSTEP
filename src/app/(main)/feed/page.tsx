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
  return <div className="mx-auto w-full max-w-[980px] space-y-6"><PageHero eyebrow="CỘNG ĐỒNG WEWIN" title="Feed học tập" description="Đọc bài viết từ WEWIN và những chia sẻ đã được duyệt của cộng đồng giáo viên." />{user ? <UserPostComposer /> : <div className="rounded-2xl border border-border bg-white px-5 py-4 text-sm leading-relaxed text-ink-muted">Guest có thể đọc bài viết. Đăng nhập để chia sẻ kinh nghiệm, mẹo học hoặc câu hỏi của bạn.</div>}<FeedBoard initial={initial} viewerId={user?.id ?? null} /><SiteFooter /></div>;
}
