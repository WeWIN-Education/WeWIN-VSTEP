import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type PageHeroProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  stats?: { label: string; value: string }[];
  aside?: ReactNode;
  className?: string;
};

export function PageHero({
  eyebrow,
  title,
  description,
  stats,
  aside,
  className,
}: PageHeroProps) {
  return (
    <section
      className={cn(
        "rounded-[20px] border border-[#C5D4EE] bg-gradient-to-br from-[#EEF3FC] to-[#DDE7F8] p-5 md:p-7",
        className,
      )}
    >
      <div className={cn(aside ? "grid gap-5 md:grid-cols-[1fr_auto] md:items-center" : "")}>
        <div>
          {eyebrow ? (
            <p className="text-[12px] font-bold tracking-wide text-brand">{eyebrow}</p>
          ) : null}
          <h1 className="mt-1 font-[family-name:var(--font-jakarta)] text-[24px] font-extrabold text-ink md:text-[30px]">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-muted">
              {description}
            </p>
          ) : null}
          {stats?.length ? (
            <div className="mt-4 flex flex-wrap gap-4">
              {stats.map((s) => (
                <div key={s.label} className="min-w-[72px]">
                  <p className="text-[18px] font-extrabold text-brand">{s.value}</p>
                  <p className="text-[11px] text-ink-muted">{s.label}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        {aside}
      </div>
    </section>
  );
}
