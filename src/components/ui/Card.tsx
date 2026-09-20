import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
};

const paddings = {
  none: "p-0",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

export function Card({
  className,
  children,
  padding = "md",
  ...props
}: CardProps) {
  const hasCustomBackground = className?.split(/\s+/).some((token) => token.startsWith("bg-"));
  return (
    <div
      className={cn(
        "min-w-0 rounded-[var(--radius-card)] border border-border shadow-[var(--shadow-panel)]",
        !hasCustomBackground && "bg-surface-card",
        paddings[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
