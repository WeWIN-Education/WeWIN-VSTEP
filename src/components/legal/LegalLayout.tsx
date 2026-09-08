import { SiteFooter } from "@/components/layout/SiteFooter";
import { Card } from "@/components/ui/Card";
import type { Metadata } from "next";
import type { ReactNode } from "react";

type LegalPageProps = {
  title: string;
  children: ReactNode;
};

export function LegalLayout({ title, children }: LegalPageProps) {
  return (
    <div className="mx-auto max-w-[800px]">
      <Card padding="lg">
        <h1 className="font-[family-name:var(--font-jakarta)] text-[24px] font-extrabold text-ink">
          {title}
        </h1>
        <div className="mt-4 space-y-3 text-[14px] leading-relaxed text-ink-muted">
          {children}
        </div>
      </Card>
      <SiteFooter />
    </div>
  );
}

export const legalMeta = (title: string): Metadata => ({
  title: `${title} | WEWIN EDUCATION`,
});
