import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { PageHero } from "@/components/ui/PageHero";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Học qua video | WEWIN EDUCATION",
};

export default async function VideoIndexPage() {
  let videos: { id: string; title: string; youtubeId: string | null; isFree: boolean }[] = [];
  try {
    videos = await prisma.homeVideo.findMany({ orderBy: { sortOrder: "asc" } });
  } catch {
    videos = [
      { id: "1", title: "Introduce yourself in English", youtubeId: "f-THLbSEZ4Y", isFree: true },
      { id: "2", title: "My daily routine", youtubeId: null, isFree: true },
    ];
  }

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHero
        eyebrow="VIDEO"
        title="Học qua video"
        description="Xem clip hội thoại và bài giảng ngắn — kèm transcript placeholder."
        stats={[
          { label: "Video", value: `${videos.length}` },
          { label: "Miễn phí", value: `${videos.filter((v) => v.isFree).length}` },
        ]}
      />

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((v) => (
          <Card key={v.id} padding="none" className="overflow-hidden">
            {v.youtubeId ? (
              <div className="aspect-video bg-ink">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://img.youtube.com/vi/${v.youtubeId}/hqdefault.jpg`}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <ImageSlot label="Thumbnail video" aspect="aspect-video" className="rounded-none border-0" />
            )}
            <div className="p-4">
              <h2 className="line-clamp-2 text-[14px] font-extrabold text-ink">{v.title}</h2>
              <Link href={`/video/${v.id}`} className="mt-3 block">
                <Button className="w-full" variant="outline" size="sm">
                  Xem bài
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
