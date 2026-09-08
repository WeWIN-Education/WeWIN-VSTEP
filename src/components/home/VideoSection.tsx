import { Card } from "@/components/ui/Card";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { SectionTitle } from "@/components/ui/SectionTitle";
import Link from "next/link";

type VideoItem = {
  id: string;
  title: string;
};

export function VideoSection({ videos }: { videos: VideoItem[] }) {
  const shown = videos.slice(0, 4);

  return (
    <Card>
      <SectionTitle
        title="Học qua video"
        action={
          <Link href="/video" className="text-[12px] font-semibold text-brand hover:underline">
            Tất cả video
          </Link>
        }
      />
      <div className="mb-3 flex flex-wrap gap-1.5">
        {["Miễn phí", "Phụ đề đồng bộ", "Luyện nghe", "Gõ nghe"].map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-medium text-ink-muted"
          >
            {tag}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {shown.map((video) => (
          <Link
            key={video.id}
            href={video.id ? `/video/${video.id}` : "/video"}
            className="group overflow-hidden rounded-xl border border-border/70 bg-surface"
          >
            <ImageSlot label="Thumbnail video" className="rounded-none border-0" />
            <div className="p-2.5">
              <p className="line-clamp-2 text-[12.5px] font-semibold leading-snug text-ink group-hover:text-brand">
                {video.title}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}
