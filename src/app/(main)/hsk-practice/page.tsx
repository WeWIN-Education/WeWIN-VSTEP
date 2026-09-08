import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { PRACTICE_TYPES } from "@/lib/practice";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bài tập | WEWIN EDUCATION",
  description: "5 dạng bài luyện tiếng Anh theo cấp độ Lớp 1–9.",
};

export default function HskPracticePage() {
  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHero
        eyebrow="BÀI TẬP"
        title="Bài tập luyện tiếng Anh"
        description="Chọn dạng bài và cấp độ. Câu hỏi demo Lớp 1 được sinh sẵn — luyện lại không giới hạn."
        stats={[
          { label: "Dạng bài", value: "5" },
          { label: "Cấp độ", value: "9" },
          { label: "Luyện lại", value: "∞" },
        ]}
      />

      <div className="mt-6">
        <SectionTitle title="5 dạng bài luyện tập" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PRACTICE_TYPES.map((item, i) => (
            <Card key={item.slug} className="flex flex-col" padding="lg">
              <div className="flex items-start gap-3">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-sm font-bold text-ink-muted">
                  {i + 1}
                </span>
                <div>
                  <h2 className="font-[family-name:var(--font-jakarta)] text-[15px] font-extrabold leading-snug text-ink">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
                    {item.description}
                  </p>
                </div>
              </div>
              <Link href={`/hsk-practice/${item.slug}`} className="mt-4 block">
                <Button className="w-full" variant="outline">
                  Bắt đầu →
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
