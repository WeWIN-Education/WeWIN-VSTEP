import { BookOpen, CheckCircle2, Headphones, Mic2, PenLine } from "lucide-react";
import type { GamificationSummary } from "@/lib/gamification";
import { Card } from "@/components/ui/Card";
import { SkillMascot } from "@/components/ui/SkillMascot";

const skillMeta = [
  { key: "LISTENING" as const, label: "Listening", icon: Headphones },
  { key: "READING" as const, label: "Reading", icon: BookOpen },
  { key: "WRITING" as const, label: "Writing", icon: PenLine },
  { key: "SPEAKING" as const, label: "Speaking", icon: Mic2 },
];

export function VstepProgressCard({ summary }: { summary: GamificationSummary }) {
  return (
    <Card padding="lg" className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-brand">MỤC TIÊU VSTEP</p>
          <h2 className="mt-1 font-[family-name:var(--font-jakarta)] text-xl font-extrabold text-ink">Chinh phục {summary.target}</h2>
          <p className="mt-1 text-sm text-ink-muted">Mỗi kỹ năng hoàn thành đóng góp 25% tiến độ.</p>
        </div>
        <span className="rounded-full bg-brand-soft px-3 py-1 text-sm font-extrabold text-brand">{summary.progressPercent}%</span>
      </div>
      <div className="mt-5" aria-label={`Tiến độ VSTEP ${summary.progressPercent}%`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={summary.progressPercent}>
        <div className="h-3 overflow-hidden rounded-full bg-brand-soft">
          <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${summary.progressPercent}%` }} />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {skillMeta.map(({ key, label, icon: Icon }) => {
          const complete = summary.completedSkills[key];
          return (
            <div key={key} className={`group min-w-0 overflow-hidden rounded-2xl border ${complete ? "border-[#CFE4D8] bg-[#F4FCF6]" : "border-border bg-surface"}`}>
              <SkillMascot skill={label} />
              <div className="px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <Icon className={`size-4 ${complete ? "text-[#1F7A4D]" : "text-ink-muted"}`} aria-hidden="true" />
                {complete ? <CheckCircle2 className="size-4 text-[#1F7A4D]" aria-label="Đã hoàn thành" /> : <span className="text-[11px] font-bold text-ink-faint">25%</span>}
              </div>
              <p className="mt-2 text-xs font-extrabold text-ink">{label}</p>
              <p className="mt-0.5 text-[11px] text-ink-muted">{complete ? "Đã luyện" : "Chưa luyện"}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
