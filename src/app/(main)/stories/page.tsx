import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { PageHero } from "@/components/ui/PageHero";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Truyện tiếng Anh | WEWIN EDUCATION",
};

export default async function StoriesPage() {
  let stories: {
    slug: string;
    title: string;
    summary: string | null;
    level: number;
    readingMin: number;
  }[] = [];

  try {
    stories = await prisma.story.findMany({ orderBy: { sortOrder: "asc" } });
  } catch {
    stories = [
      {
        slug: "hello-lan",
        title: "Hello, I'm Lan",
        summary: "Lan chào bạn mới.",
        level: 1,
        readingMin: 4,
      },
    ];
  }

  return (
    <div className="mx-auto max-w-[1000px]">
      <PageHero
        eyebrow="TRUYỆN"
        title="Truyện tiếng Anh"
        description="Đọc truyện ngắn theo cấp độ — luyện từ vựng trong ngữ cảnh."
      />

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stories.map((s) => (
          <Card key={s.slug} padding="none" className="overflow-hidden">
            <ImageSlot label={s.title} aspect="aspect-[16/9]" className="rounded-none border-0 border-b border-border" />
            <div className="p-4">
              <p className="text-[11px] font-bold text-brand">
                Lớp {s.level} · {s.readingMin} phút
              </p>
              <h2 className="mt-1 text-[15px] font-extrabold text-ink">{s.title}</h2>
              <p className="mt-1 line-clamp-2 text-[13px] text-ink-muted">{s.summary}</p>
              <Link href={`/stories/${s.slug}`} className="mt-3 block">
                <Button className="w-full" variant="outline" size="sm">
                  Đọc truyện
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>

      <SiteFooter />
    </div>
  );
}
