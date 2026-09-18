import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import { getCurrentUser } from "@/lib/access";
import { getGamificationSummary, getLeaderboard } from "@/lib/gamification";
import { Medal, Trophy } from "lucide-react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Bảng xếp hạng XP | WEWIN EDUCATION" };

export default async function LeaderboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/leaderboard");

  const [data, summary] = await Promise.all([getLeaderboard(user.id), getGamificationSummary(user.id)]);

  return (
    <div className="mx-auto w-full max-w-[860px] space-y-6">
      <PageHero eyebrow="VSTEP COMMUNITY" title="Bảng xếp hạng XP" description="XP được cộng sau mỗi lượt luyện VSTEP đã nộp. Người có cùng XP sẽ cùng thứ hạng." stats={[{ label: "XP của bạn", value: String(summary.xp) }, { label: "Hạng hiện tại", value: data.currentUser ? `#${data.currentUser.rank}` : "—" }]} />
      <Card padding="lg">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#FFF8EA] text-[#B87919]"><Trophy className="size-5" aria-hidden="true" /></span>
          <div><h2 className="font-[family-name:var(--font-jakarta)] text-xl font-extrabold text-ink">Top 10 học viên</h2><p className="mt-1 text-sm text-ink-muted">Admin không tham gia bảng xếp hạng.</p></div>
        </div>
        <div className="mt-5 space-y-2" aria-label="Bảng xếp hạng học viên">
          {data.entries.length ? data.entries.map((entry) => <div key={entry.id} className={`flex min-h-14 items-center gap-3 rounded-2xl border px-3 py-2.5 sm:px-4 ${entry.isCurrentUser ? "border-brand/35 bg-brand-soft/70" : "border-border bg-white"}`}><span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-surface text-sm font-extrabold text-brand">{entry.rank}</span><Medal className="size-5 shrink-0 text-[#D4A017]" aria-hidden="true" /><span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{entry.name?.trim() || "Học viên"}{entry.isCurrentUser ? <span className="ml-1 text-xs font-normal text-brand">(bạn)</span> : null}</span><span className="shrink-0 text-sm font-extrabold text-[#1F7A4D]">{entry.xp} XP</span></div>) : <p className="rounded-2xl bg-surface px-4 py-8 text-center text-sm text-ink-muted">Chưa có học viên trên bảng xếp hạng.</p>}
        </div>
        {data.currentUser ? <p className="mt-5 rounded-2xl bg-brand-soft px-4 py-3 text-sm font-semibold text-brand">Bạn đang ở hạng #{data.currentUser.rank} với {data.currentUser.xp} XP.</p> : <p className="mt-5 rounded-2xl bg-surface px-4 py-3 text-sm text-ink-muted">Tài khoản quản trị có thể xem bảng xếp hạng nhưng không được xếp hạng.</p>}
      </Card>
    </div>
  );
}
