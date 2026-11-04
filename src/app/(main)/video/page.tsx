import { PageHero } from "@/components/ui/PageHero";
import { VideoCatalog } from "@/components/video/VideoCatalog";
import { listPublishedLearningVideos } from "@/lib/video-repository";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Luyện thi VSTEP qua video | WEWIN EDUCATION" };
export const dynamic = "force-dynamic";

export default async function VideoIndexPage({ searchParams }: { searchParams: Promise<{ page?: string; filter?: string; q?: string }> }) {
  const params = await searchParams;
  const filter = (params.filter || "").slice(0, 80), q = (params.q || "").trim().slice(0, 100);
  const result = await listPublishedLearningVideos(Math.max(1, Math.min(100000, Number(params.page) || 1)) | 0, filter, q);
  return <div className="mx-auto max-w-[1180px]"><PageHero eyebrow="LUYỆN THI VSTEP QUA VIDEO" title="Học qua video" description="Luyện nghe, phát âm và từ vựng theo các chủ đề thường gặp trong quá trình ôn thi VSTEP." stats={[{ label: "Video phù hợp", value: `${result.total}` }, { label: "Trang", value: `${result.page}/${result.pages}` }]} /><VideoCatalog {...result} filter={filter} q={q} /></div>;
}
