import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand text-white hover:bg-brand-dark shadow-sm border border-transparent",
  secondary:
    "bg-brand-soft text-brand hover:bg-brand-pink border border-transparent",
  outline:
    "bg-white text-ink border border-border hover:border-brand hover:text-brand",
  ghost: "bg-transparent text-ink-muted hover:bg-white hover:text-ink",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs rounded-[10px]",
  md: "h-10 px-4 text-sm rounded-[var(--radius-btn)]",
  lg: "h-12 px-5 text-sm font-semibold rounded-[var(--radius-btn)]",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
