import { SiteFooter } from "@/components/layout/SiteFooter";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Props = { params: Promise<{ slug: string }> };

type Word = { en: string; vi: string };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Từ vựng: ${slug} | WEWIN EDUCATION` };
}

export default async function VocabTopicDetailPage({ params }: Props) {
  const { slug } = await params;
  let topic = null;
  try {
    topic = await prisma.vocabTopic.findUnique({ where: { slug } });
  } catch {
    notFound();
  }
  if (!topic) notFound();

  const words = (Array.isArray(topic.words) ? topic.words : []) as Word[];

  return (
    <div className="mx-auto max-w-[800px]">
      <Link
        href="/vocab/topics"
        className="mb-3 inline-block text-[13px] font-semibold text-brand hover:underline"
      >
        ← Tất cả chủ đề
      </Link>
      <PageHero
        eyebrow={`LỚP ${topic.level}`}
        title={topic.title}
        description={topic.description ?? undefined}
      />

      <div className="mt-5 space-y-2">
        {words.map((w) => (
          <Card key={w.en} className="flex items-center justify-between gap-3" padding="md">
            <div>
              <p className="text-[15px] font-extrabold text-ink">{w.en}</p>
              <p className="text-[13px] text-ink-muted">{w.vi}</p>
            </div>
            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold text-brand">
              EN
            </span>
          </Card>
        ))}
      </div>

      <SiteFooter />
    </div>
  );
}
