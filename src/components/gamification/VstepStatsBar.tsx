import { Flame, Heart, Target, Zap } from "lucide-react";
import { NavigationLink as Link } from "@/components/layout/NavigationLink";
import type { GamificationSummary } from "@/lib/gamification";

export function VstepStatsBar({ summary }: { summary: GamificationSummary }) {
  const progress = Math.min(100, Math.max(0, summary.progressPercent));
  const stats = [
    { label: "Ngày liên tục", value: summary.streakDays, Icon: Flame, tone: "text-amber-700 bg-amber-50", href: null },
    { label: "XP", value: summary.xp, Icon: Zap, tone: "text-emerald-700 bg-emerald-50", href: "/leaderboard" },
    { label: "Tim", value: summary.heartsReceived, Icon: Heart, tone: "text-rose-700 bg-rose-50", href: null },
  ];
  return <section aria-label="Thống kê VSTEP" className="flex flex-wrap items-center gap-2 rounded-2xl border-2 border-brand-soft bg-white p-1.5 sm:gap-3">
    <Link href="/profile/settings" aria-label={`Mục tiêu VSTEP ${summary.target}, tiến độ ${progress}%`} className="flex min-h-11 flex-1 items-center gap-2 rounded-xl bg-brand-soft/60 px-2.5 focus-visible:outline-2 focus-visible:outline-brand sm:min-w-40">
      <Target className="size-5 shrink-0 text-brand" aria-hidden="true" />
      <span className="min-w-20 flex-1">
        <span className="flex items-center justify-between gap-3 text-xs"><strong className="text-brand">{summary.target}</strong><span className="tabular-nums text-ink">{progress}%</span></span>
        <span role="progressbar" aria-label="Tiến độ mục tiêu VSTEP" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-white"><span className="block h-full origin-left rounded-full bg-brand" style={{ transform: `scaleX(${progress / 100})` }} /></span>
      </span>
    </Link>
    <div className="flex flex-1 items-center justify-between gap-1 sm:gap-2">
      {stats.map(({ label, value, Icon, tone, href }) => {
        const content = <><span className={`flex size-7 shrink-0 items-center justify-center rounded-full ${tone}`}><Icon className="size-4" aria-hidden="true" strokeWidth={2} /></span><span><span className="block text-sm font-bold leading-5 tabular-nums text-ink">{value.toLocaleString("vi-VN")}</span><span className="block whitespace-nowrap text-[11px] leading-4 text-ink-muted">{label}</span></span></>;
        const style = "flex min-h-11 items-center gap-1.5 rounded-xl px-1.5 sm:px-2";
        return href ? <Link key={label} href={href} className={`${style} transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand`} aria-label={`${label}: ${value}, xem bảng xếp hạng`}>{content}</Link> : <div key={label} className={style} aria-label={`${label}: ${value}`}>{content}</div>;
      })}
    </div>
  </section>;
}
