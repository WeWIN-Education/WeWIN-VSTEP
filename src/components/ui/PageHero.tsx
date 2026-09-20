import { cn } from "@/lib/utils";
import { LinkifiedText } from "@/components/ui/LinkifiedText";
import type { ReactNode } from "react";

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
  backgroundSrc,
}: PageHeroProps) {
  return (
    <section
      className={cn(
        "w-full min-w-0 max-w-full overflow-hidden rounded-[20px] border border-[#C5D4EE] bg-gradient-to-br from-[#EEF3FC] to-[#DDE7F8] p-5 md:p-7",
        className,
      )}
      style={backgroundSrc ? { backgroundImage: `linear-gradient(90deg, rgba(255, 249, 236, 0.96) 0%, rgba(255, 249, 236, 0.84) 42%, rgba(255, 249, 236, 0.2) 76%, rgba(255, 249, 236, 0.04) 100%), url('${backgroundSrc}')` } : undefined}
    >
      <div className={cn("w-full min-w-0", aside ? "grid gap-5 md:grid-cols-[1fr_auto] md:items-center" : "")}>
        <div>
          {eyebrow ? (
            <p className="text-[12px] font-bold tracking-wide text-brand">{eyebrow}</p>
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
