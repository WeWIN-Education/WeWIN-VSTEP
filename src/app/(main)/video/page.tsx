import { PageHero } from "@/components/ui/PageHero";
import { VideoCatalog } from "@/components/video/VideoCatalog";
import { listPublishedLearningVideos } from "@/lib/video-repository";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Luyện thi VSTEP qua video | WEWIN EDUCATION" };
export const dynamic = "force-dynamic";

export default async function VideoIndexPage() {
  const videos = await listPublishedLearningVideos();
  return <div className="mx-auto max-w-[1180px]"><PageHero eyebrow="LUYỆN THI VSTEP QUA VIDEO" title="Học qua video" description="Luyện nghe, phát âm và từ vựng theo các chủ đề thường gặp trong quá trình ôn thi VSTEP." stats={[{ label: "Video", value: `${videos.length}` }, { label: "Có transcript", value: `${videos.filter((video) => video.transcript.length > 0).length}` }]} /><VideoCatalog videos={videos} /></div>;
}
