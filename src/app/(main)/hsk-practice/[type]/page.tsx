import { PracticePlayer, type PracticePayload } from "@/components/practice/PracticePlayer";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { PageHero } from "@/components/ui/PageHero";
import { getPracticeItems, getPracticeMeta, PRACTICE_TYPES } from "@/lib/practice";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Props = { params: Promise<{ type: string }> };

export function generateStaticParams() {
  return PRACTICE_TYPES.map((t) => ({ type: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type } = await params;
  const meta = getPracticeMeta(type);
  return {
    title: meta ? `${meta.title} | WEWIN EDUCATION` : "Bài tập | WEWIN EDUCATION",
  };
}

export default async function PracticeTypePage({ params }: Props) {
  const { type: slug } = await params;
  const meta = getPracticeMeta(slug);
  if (!meta) notFound();

  let items: {
    id: string;
    prompt: string;
    instruction: string | null;
    payload: PracticePayload;
    answer: unknown;
  }[] = [];

  try {
    const rows = await getPracticeItems(meta.type, 1);
    items = rows.map((r) => ({
      id: r.id,
      prompt: r.prompt,
      instruction: r.instruction,
      payload: r.payload as PracticePayload,
      answer: r.answer,
    }));
  } catch {
    // DB unavailable
  }

  return (
    <div className="mx-auto max-w-[800px]">
      <Link
        href="/hsk-practice"
        className="mb-3 inline-block text-[13px] font-semibold text-brand hover:underline"
      >
        ← Tất cả dạng bài
      </Link>
      <PageHero
        eyebrow="LỚP 1 · DEMO"
        title={meta.title}
        description={meta.description}
        className="mb-5"
      />
      <PracticePlayer type={meta.type} items={items} />
      <SiteFooter />
    </div>
  );
}
