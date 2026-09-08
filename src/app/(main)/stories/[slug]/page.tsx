import { SiteFooter } from "@/components/layout/SiteFooter";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Truyện: ${slug} | WEWIN EDUCATION` };
}

export default async function StoryDetailPage({ params }: Props) {
  const { slug } = await params;
  let story = null;
  try {
    story = await prisma.story.findUnique({ where: { slug } });
  } catch {
    notFound();
  }
  if (!story) notFound();

  return (
    <div className="mx-auto max-w-[720px]">
      <Link
        href="/stories"
        className="mb-3 inline-block text-[13px] font-semibold text-brand hover:underline"
      >
        ← Tất cả truyện
      </Link>
      <PageHero
        eyebrow={`LỚP ${story.level} · ${story.readingMin} PHÚT`}
        title={story.title}
        description={story.summary ?? undefined}
      />
      <Card className="mt-5" padding="lg">
        <div className="space-y-4 text-[15px] leading-relaxed text-ink">
          {(story.body ?? "").split(/(?<=\.)\s+/).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </Card>
      <SiteFooter />
    </div>
  );
}
