import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type SectionTitleProps = {
  title: string;
  action?: ReactNode;
  className?: string;
  as?: "h2" | "h3";
};

export function SectionTitle({
  title,
  action,
  className,
  as: Tag = "h3",
}: SectionTitleProps) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
      <Tag className="font-[family-name:var(--font-jakarta)] text-[15px] font-bold text-ink">
        {title}
      </Tag>
      {action}
    </div>
  );
}
