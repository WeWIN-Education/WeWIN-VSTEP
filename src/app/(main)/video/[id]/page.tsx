import { SiteFooter } from "@/components/layout/SiteFooter";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `Video ${id} | WEWIN EDUCATION` };
}

export default async function VideoDetailPage({ params }: Props) {
  const { id } = await params;
  let video = null;
  try {
    video = await prisma.homeVideo.findUnique({ where: { id } });
  } catch {
    notFound();
  }
  if (!video) notFound();

  return (
    <div className="mx-auto max-w-[900px]">
      <Link
        href="/video"
        className="mb-3 inline-block text-[13px] font-semibold text-brand hover:underline"
      >
        ← Tất cả video
      </Link>
      <PageHero eyebrow="VIDEO" title={video.title} />

      <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-ink">
        {video.youtubeId ? (
          <div className="aspect-video">
            <iframe
              title={video.title}
              src={`https://www.youtube.com/embed/${video.youtubeId}`}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="flex aspect-video items-center justify-center text-sm text-white/70">
            Video chưa có YouTube ID — sẽ bổ sung sau.
          </div>
        )}
      </div>

      <Card className="mt-4" padding="lg">
        <h2 className="text-sm font-bold text-ink">Transcript (placeholder)</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
          Transcript song ngữ sẽ hiển thị tại đây. Hiện tại đây là bản stub để giữ layout.
          Hãy nghe và ghi chú các từ khoá quan trọng trong bài.
        </p>
      </Card>

      <SiteFooter />
    </div>
  );
}
