import { VideoLearningPlayer } from "@/components/video/VideoLearningPlayer";
import { LoginGate } from "@/components/auth/LoginGate";
import { findLearningVideo } from "@/lib/video-config";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const video = findLearningVideo(id);
  return { title: video ? `${video.title} | WEWIN EDUCATION` : "Video | WEWIN EDUCATION" };
}

export default async function VideoDetailPage({ params }: Props) {
  const { id } = await params;
  const video = findLearningVideo(id);
  if (!video) notFound();
  return <div className="mx-auto max-w-[1180px]"><Link href="/video" className="mb-3 inline-flex text-sm font-semibold text-brand hover:underline">← Học qua video</Link><div className="mb-5 flex flex-wrap items-end gap-3"><span className="rounded-full bg-[#ECFBF3] px-3 py-1 text-xs font-extrabold text-[#1F7A4D]">MIỄN PHÍ · {video.level}</span><h1 className="font-[family-name:var(--font-jakarta)] text-2xl font-extrabold text-ink md:text-3xl">{video.title}</h1></div><p className="mb-5 text-sm text-ink-muted">{video.description}</p><LoginGate title="Đăng nhập để mở video" description="Guest có thể xem danh mục video; tài khoản WEWIN mới mở player, transcript và lưu tiến độ." callbackUrl={`/video/${id}`}><VideoLearningPlayer video={video} /></LoginGate></div>;
}
