import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import { LEARNING_VIDEOS } from "@/lib/video-config";
import { Play } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Classroom English qua video | WEWIN EDUCATION" };

export default function VideoIndexPage() {
  return <div className="mx-auto max-w-[1180px]"><PageHero eyebrow="CLASSROOM ENGLISH" title="Học qua video" description="Xem tình huống sư phạm, nghe câu mẫu và luyện cách nói tự nhiên trong lớp học." stats={[{ label: "Video", value: `${LEARNING_VIDEOS.length}` }, { label: "Có transcript", value: `${LEARNING_VIDEOS.length}` }]} /><div className="mt-6 flex gap-2 overflow-x-auto pb-1">{["Tất cả", "A1", "A2", "Điều phối lớp", "Đưa hướng dẫn"].map((filter, index) => <span key={filter} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold ${index === 0 ? "border-brand bg-brand-soft text-brand" : "border-border bg-white text-ink-muted"}`}>{filter}</span>)}</div><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{LEARNING_VIDEOS.map((video) => <Link key={video.slug} href={`/video/${video.slug}`}><Card padding="none" className="group h-full overflow-hidden transition hover:-translate-y-0.5 hover:border-brand/40"><div className="relative aspect-video overflow-hidden bg-[#101828]"><Image src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`} alt="" fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover transition duration-300 group-hover:scale-105" /><span className="absolute inset-0 flex items-center justify-center bg-black/10"><span className="flex size-14 items-center justify-center rounded-full bg-white/90 text-brand shadow-lg"><Play className="ml-1 size-6 fill-current" /></span></span><span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-1 text-[10px] font-extrabold text-brand">{video.level}</span><span className="absolute bottom-3 right-3 rounded-md bg-black/60 px-2 py-1 text-[10px] font-bold text-white">{video.duration}</span></div><div className="p-4"><h2 className="text-[15px] font-extrabold text-ink">{video.title}</h2><p className="mt-1 text-xs text-ink-muted">{video.titleVi}</p><p className="mt-3 line-clamp-2 text-xs leading-relaxed text-ink-muted">{video.description}</p><p className="mt-4 text-xs font-extrabold text-brand">Xem bài →</p></div></Card></Link>)}</div></div>;
}
