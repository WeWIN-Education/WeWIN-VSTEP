"use client";

import { Card } from "@/components/ui/Card";
import type { LearningVideo } from "@/lib/video-config";
import { Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

export function VideoCatalog({ videos }: { videos: LearningVideo[] }) {
  const [filter, setFilter] = useState("Tất cả");
  const filters = useMemo(() => ["Tất cả", ...Array.from(new Set(videos.flatMap((video) => [video.level, video.category]).filter(Boolean)))], [videos]);
  const visible = filter === "Tất cả" ? videos : videos.filter((video) => video.level === filter || video.category === filter);
  return <><div className="mt-6 flex gap-2 overflow-x-auto pb-1">{filters.map((item) => <button key={item} type="button" onClick={() => setFilter(item)} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold ${filter === item ? "border-brand bg-brand-soft text-brand" : "border-border bg-white text-ink-muted"}`} aria-pressed={filter === item}>{item}</button>)}</div><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{visible.map((video) => <Link key={video.slug} href={`/video/${video.slug}`}><Card padding="none" className="group h-full overflow-hidden transition hover:-translate-y-0.5 hover:border-brand/40"><div className="relative aspect-video overflow-hidden bg-[#101828]"><Image src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`} alt="" fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover transition duration-300 group-hover:scale-105" /><span className="absolute inset-0 flex items-center justify-center bg-black/10"><span className="flex size-14 items-center justify-center rounded-full bg-white/90 text-brand shadow-lg"><Play className="ml-1 size-6 fill-current" /></span></span><span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-1 text-[10px] font-extrabold text-brand">{video.level}</span><span className="absolute bottom-3 right-3 rounded-md bg-black/60 px-2 py-1 text-[10px] font-bold text-white">{video.duration}</span></div><div className="p-4"><h2 className="text-[15px] font-extrabold text-ink">{video.title}</h2><p className="mt-1 text-xs text-ink-muted">{video.titleVi}</p><p className="mt-3 line-clamp-2 text-xs leading-relaxed text-ink-muted">{video.description}</p><p className="mt-4 text-xs font-extrabold text-brand">Xem bài →</p></div></Card></Link>)}</div>{visible.length === 0 && <Card className="mt-5 text-sm text-ink-muted">Chưa có video thuộc bộ lọc này.</Card>}</>;
}
