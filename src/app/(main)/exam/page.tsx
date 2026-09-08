import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { PageHero } from "@/components/ui/PageHero";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Luyện thi | WEWIN EDUCATION",
  description: "Đề thi thử tiếng Anh theo Lớp 1–9.",
};

const LEVELS = Array.from({ length: 9 }, (_, i) => ({
  level: i + 1,
  slug: `lop-${i + 1}`,
  title: `Lớp ${i + 1}`,
  subtitle: i === 0 ? "Cơ bản" : i < 4 ? "Trung cấp" : "Nâng cao",
}));

export default function ExamIndexPage() {
  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <PageHero
          eyebrow="LUYỆN THI"
          title="Luyện thi tiếng Anh"
          description="Làm đề thi thử theo từng lớp, theo dõi điểm số và cải thiện kỹ năng đọc – nghe – ngữ pháp."
        />
        <Card padding="lg" className="flex flex-col justify-between">
          <div>
            <p className="text-[12px] font-bold text-ink-muted">Tiến độ Lớp 1</p>
            <p className="mt-2 font-[family-name:var(--font-jakarta)] text-3xl font-extrabold text-brand">
              0%
            </p>
            <p className="mt-1 text-[13px] text-ink-muted">Đề đã làm: 0 · Điểm TB: —</p>
          </div>
          <Link href="/exam/lop-1" className="mt-4 block">
            <Button className="w-full">Luyện đề ngay</Button>
          </Link>
        </Card>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {LEVELS.map((lv, i) => (
          <Link key={lv.slug} href={`/exam/${lv.slug}`}>
            <Card
              className={cn(
                "h-full transition-colors hover:border-brand",
                i === 0 && "border-brand shadow-sm",
              )}
            >
              <p className="text-[12px] font-bold text-brand">{lv.title}</p>
              <p className="mt-1 text-[13px] font-semibold text-ink">{lv.subtitle}</p>
              <p className="mt-2 text-[11px] text-ink-faint">
                {i === 0 ? "3 đề demo" : "Sắp có"}
              </p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-6">
        <ImageSlot label="Minh họa luyện thi" className="min-h-[120px]" />
      </div>

      <SiteFooter />
    </div>
  );
}
