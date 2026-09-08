import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Từ vựng theo chủ đề | WEWIN EDUCATION",
};

const FALLBACK = [
  { slug: "greetings", title: "Chào hỏi", description: "Hello, Hi…", wordCount: 12, level: 1 },
  { slug: "family", title: "Gia đình", description: "father, mother…", wordCount: 10, level: 1 },
  { slug: "numbers", title: "Số đếm", description: "one to twenty", wordCount: 20, level: 1 },
  { slug: "food", title: "Thức ăn & đồ uống", description: "rice, bread…", wordCount: 15, level: 1 },
];

export default async function VocabTopicsPage() {
  let topics = FALLBACK;
  try {
    const rows = await prisma.vocabTopic.findMany({ orderBy: { sortOrder: "asc" } });
    if (rows.length) {
      topics = rows.map((t) => ({
        slug: t.slug,
        title: t.title,
        description: t.description ?? "",
        wordCount: t.wordCount,
        level: t.level,
      }));
    }
  } catch {
    // fallback
  }

  return (
    <div className="mx-auto max-w-[1000px]">
      <PageHero
        eyebrow="TỪ VỰNG"
        title="Từ vựng theo chủ đề"
        description="Học theo nhóm nghĩa — phù hợp Lớp 1 và lộ trình giao tiếp hàng ngày."
      />

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((t) => (
          <Card key={t.slug} padding="lg" className="flex flex-col">
            <p className="text-[11px] font-bold uppercase text-brand">Lớp {t.level}</p>
            <h2 className="mt-1 font-[family-name:var(--font-jakarta)] text-[16px] font-extrabold text-ink">
              {t.title}
            </h2>
            <p className="mt-1 flex-1 text-[13px] text-ink-muted">{t.description}</p>
            <p className="mt-2 text-[12px] text-ink-faint">{t.wordCount} từ</p>
            <Link href={`/vocab/topics/${t.slug}`} className="mt-3 block">
              <Button className="w-full" variant="outline">
                Xem từ
              </Button>
            </Link>
          </Card>
        ))}
      </div>

      <SiteFooter />
    </div>
  );
}
