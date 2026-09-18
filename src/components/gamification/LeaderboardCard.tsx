import { ArrowRight, Medal, Trophy } from "lucide-react";
import Link from "next/link";
import type { LeaderboardData } from "@/lib/gamification";
import { Card } from "@/components/ui/Card";

function displayName(name: string | null) {
  return name?.trim() || "Học viên";
}

export function LeaderboardCard({ data }: { data: LeaderboardData }) {
  const topEntries = data.entries.filter((entry) => entry.rank <= 5);
  const currentOutsidePreview = data.currentUser && !topEntries.some((entry) => entry.id === data.currentUser?.id) ? data.currentUser : null;

  return (
    <Card padding="lg" className="overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-brand">BẢNG XẾP HẠNG</p>
          <h2 className="mt-1 font-[family-name:var(--font-jakarta)] text-xl font-extrabold text-ink">Top XP VSTEP</h2>
          <p className="mt-1 text-sm text-ink-muted">Tính theo tổng XP từ các lượt luyện đã nộp.</p>
        </div>
        <Trophy className="size-6 shrink-0 text-[#D4A017]" aria-hidden="true" />
      </div>
      <div className="mt-5 space-y-2">
        {topEntries.length ? topEntries.map((entry) => <LeaderboardRow key={entry.id} entry={entry} />) : <p className="rounded-xl bg-surface px-3 py-4 text-center text-sm text-ink-muted">Chưa có dữ liệu xếp hạng.</p>}
        {currentOutsidePreview ? <><div className="py-1 text-center text-xs text-ink-faint" aria-hidden="true">…</div><LeaderboardRow entry={currentOutsidePreview} /></> : null}
      </div>
      <Link href="/leaderboard" className="mt-5 inline-flex min-h-10 items-center gap-2 text-sm font-extrabold text-brand hover:text-brand-dark">
        Xem bảng đầy đủ <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </Card>
  );
}

function LeaderboardRow({ entry }: { entry: LeaderboardData["entries"][number] }) {
  return (
    <div className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 ${entry.isCurrentUser ? "bg-brand-soft" : "bg-surface"}`}>
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-extrabold text-brand">{entry.rank}</span>
      <Medal className="size-4 shrink-0 text-[#D4A017]" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{displayName(entry.name)}{entry.isCurrentUser ? <span className="ml-1 text-xs font-normal text-brand">(bạn)</span> : null}</span>
      <span className="shrink-0 text-sm font-extrabold text-[#1F7A4D]">{entry.xp} XP</span>
    </div>
  );
}
