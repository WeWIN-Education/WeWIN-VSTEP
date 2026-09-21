import { cn } from "@/lib/utils";
import { LinkifiedText } from "@/components/ui/LinkifiedText";
import type { ReactNode } from "react";
import Image from "next/image";
import { GraduationCap } from "lucide-react";

type PageHeroProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  stats?: { label: string; value: string }[];
  aside?: ReactNode;
  className?: string;
  backgroundSrc?: string;
};

export function PageHero({
  eyebrow,
  title,
  description,
  stats,
  aside,
  className,
  backgroundSrc = "/brand/learning-banner.webp",
}: PageHeroProps) {
  return (
    <section
      className={cn(
        "relative isolate w-full min-w-0 max-w-full overflow-hidden rounded-[24px] border-2 border-border bg-white p-5 shadow-[var(--shadow-panel)] md:p-7",
        className,
      )}
    >
      {backgroundSrc && <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true"><Image src={backgroundSrc} alt="" fill sizes="(max-width: 768px) 100vw, 1180px" className="object-cover object-right" /><div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-white/30" /><div className="absolute inset-0 bg-white/40 md:bg-transparent" /></div>}
      <div className={cn("w-full min-w-0", aside ? "grid gap-5 md:grid-cols-[1fr_auto] md:items-center" : "")}>
        <div className="min-w-0 md:max-w-[75%]">
          {eyebrow ? (
            <p className="mb-3 inline-flex max-w-full items-center gap-2 rounded-full border border-brand/20 bg-white/90 px-3 py-1 text-xs font-bold tracking-wide text-brand"><GraduationCap className="size-4 shrink-0" aria-hidden="true" />{eyebrow}</p>
          ) : null}
          <h1 className="mt-1 max-w-full break-words whitespace-normal font-[family-name:var(--font-jakarta)] text-[22px] font-extrabold leading-tight text-ink sm:text-[24px] md:text-[30px]">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-[34rem] break-words text-[14px] leading-relaxed text-ink-muted">
              <LinkifiedText>{description}</LinkifiedText>
            </p>
          ) : null}
          {stats?.length ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {stats.map((s) => (
                <div key={s.label} className="min-w-[88px] rounded-xl border border-white bg-white/90 px-3 py-2">
                  <p className="text-[18px] font-extrabold text-brand">{s.value}</p>
                  <p className="text-xs text-ink-muted">{s.label}</p>
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
