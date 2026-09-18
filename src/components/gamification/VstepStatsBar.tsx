import { CheckCircle2, Flame, Heart, Target, Zap } from "lucide-react";
import Link from "next/link";
import type { GamificationSummary } from "@/lib/gamification";
import type { ReactNode } from "react";

function progressLabel(progress: number) {
  if (progress >= 100) return "Hoàn thành";
  if (progress > 0) return "Đang học";
  return "Bắt đầu";
}

export function VstepStatsBar({ summary }: { summary: GamificationSummary }) {
  const progressText = `${summary.progressPercent}%`;
  const statusText = progressLabel(summary.progressPercent);

  return (
    <section className="w-full overflow-x-auto xl:w-auto xl:overflow-visible" aria-label="Thống kê VSTEP">
      <div className="flex min-w-max items-center gap-1.5 xl:min-w-0">
        <Link
          href="/profile/settings"
          className="group flex h-10 w-[176px] shrink-0 items-center gap-2 rounded-2xl border border-[#C9DDFF] bg-[#F7FAFF] px-2.5 shadow-[0_5px_16px_rgba(48,113,232,0.08)] transition duration-200 hover:border-[#9FC2FF] hover:shadow-[0_8px_20px_rgba(48,113,232,0.13)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          aria-label={`Mục tiêu VSTEP ${summary.target}, tiến độ ${progressText}, trạng thái ${statusText}`}
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#DCEAFF]" aria-hidden="true">
            <span className="flex size-5 items-center justify-center rounded-full bg-[#2F70E8] text-white shadow-[0_3px_8px_rgba(47,112,232,0.24)]">
              <Target className="size-3.5" strokeWidth={2.5} />
            </span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="relative top-1 flex items-center gap-1.5 leading-none">
              <span className="relative top-0.5 text-[15px] font-extrabold tracking-tight text-[#1554AD]">{summary.target}</span>
              <span className="relative top-[3px] text-[11px] font-semibold tabular-nums text-ink-muted">{progressText}</span>
            </span>
            <span className="mt-1.5 flex items-center gap-1.5">
              <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#DCEAFF]" role="progressbar" aria-label={`Tiến độ ${progressText}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={summary.progressPercent}>
                <span className="block h-full rounded-full bg-[#2F70E8] transition-[width] duration-500" style={{ width: `${summary.progressPercent}%` }} />
              </span>
              <span className="hidden shrink-0 items-center gap-0.5 rounded-full bg-[#E7F0FF] px-1.5 py-0.5 text-[9px] font-extrabold text-[#2F70E8] sm:inline-flex">
                {statusText}
                {summary.progressPercent >= 100 ? <CheckCircle2 className="size-3" aria-hidden="true" /> : null}
              </span>
            </span>
          </span>
        </Link>

        <StatCard
          label="Streak"
          value={String(summary.streakDays)}
          ariaLabel={`Streak: ${summary.streakDays} ngày liên tục`}
          icon={<Flame className="size-4 fill-current" strokeWidth={1.8} />}
          iconClassName="bg-[#FFF0D3] text-[#F08A13]"
          className="border-[#F5DEB4] bg-[#FFFBF2] text-[#8A5B16] hover:border-[#F0CC89]"
        />
        <StatCard
          label="XP"
          value={String(summary.xp)}
          ariaLabel={`XP: ${summary.xp} điểm kinh nghiệm`}
          href="/leaderboard"
          icon={<Zap className="size-4 fill-current" strokeWidth={1.8} />}
          iconClassName="bg-[#D9F3E5] text-[#37A972]"
          className="border-[#C9ECDD] bg-[#F2FBF6] text-[#1F7A4D] hover:border-[#9ED5B8]"
        />
        <StatCard
          label="Tim"
          value={String(summary.heartsReceived)}
          ariaLabel={`Tim: ${summary.heartsReceived} tim nhận được`}
          icon={<Heart className="size-4 fill-current" strokeWidth={1.8} />}
          iconClassName="bg-[#FFE0E5] text-[#E64655]"
          className="border-[#F4D0D8] bg-[#FFF6F7] text-[#B42318] hover:border-[#F0AAB7]"
        />
      </div>
    </section>
  );
}

function StatCard({ label, value, ariaLabel, icon, iconClassName, className, href }: { label: string; value: string; ariaLabel: string; icon: ReactNode; iconClassName: string; className: string; href?: string }) {
  const content = (
    <>
      <span className={`flex size-7 shrink-0 items-center justify-center rounded-full ${iconClassName}`} aria-hidden="true">{icon}</span>
      <span className="flex min-w-0 items-baseline gap-1">
        <span className="whitespace-nowrap text-[10px] font-semibold opacity-75">{label}</span>
        <span className="shrink-0 text-[18px] font-extrabold leading-none tracking-tight text-ink">{value}</span>
      </span>
    </>
  );

  const cardClassName = `group flex h-10 w-[100px] shrink-0 items-center gap-1.5 rounded-2xl border px-2 transition duration-200 hover:shadow-[0_5px_16px_rgba(31,41,55,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${className}`;
  return href ? <Link href={href} className={cardClassName} aria-label={ariaLabel}>{content}</Link> : <div role="group" className={cardClassName} aria-label={ariaLabel}>{content}</div>;
}
