"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ArrowRight, LoaderCircle, Newspaper, UserRound } from "lucide-react";
import { PostInteractions } from "@/components/community/PostInteractions";
import type { FeedItem, FeedPage } from "@/lib/feed";

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value));
}

function FeedCard({ item, viewerId }: { item: FeedItem; viewerId: string | null }) {
  return <article className="overflow-hidden rounded-[24px] border border-border bg-white shadow-sm"><div className="p-5 sm:p-6"><div className="flex items-center gap-2 text-xs font-bold text-ink-muted"><span className="flex size-8 items-center justify-center rounded-xl bg-brand-soft text-brand">{item.kind === "SYSTEM" ? <Newspaper className="size-4" aria-hidden="true" /> : <UserRound className="size-4" aria-hidden="true" />}</span><span>{item.kind === "SYSTEM" ? "WEWIN" : item.author?.name || "Thành viên"}</span><span aria-hidden="true">·</span><time dateTime={item.publishedAt}>{dateLabel(item.publishedAt)}</time></div><h2 className="mt-4 font-[family-name:var(--font-jakarta)] text-xl font-extrabold leading-tight text-ink">{item.title}</h2><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-muted">{item.excerpt || item.body}</p>{item.imageKey ? <Image src={`/api/posts/media/${encodeURIComponent(item.imageKey)}`} alt="Ảnh trong bài viết" width={1200} height={800} sizes="(max-width: 768px) 100vw, 720px" className="mt-4 max-h-[360px] w-full rounded-2xl object-cover" /> : null}<div className="mt-5 flex flex-wrap items-center justify-between gap-3"><Link href={item.kind === "SYSTEM" ? `/blog/${item.slug}` : `/members/${item.author?.id || ""}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-brand px-3 text-sm font-extrabold text-brand transition hover:bg-brand hover:text-white">{item.kind === "SYSTEM" ? "Đọc bài" : "Xem trang thành viên"}<ArrowRight className="size-4" aria-hidden="true" /></Link></div><PostInteractions item={item} viewerId={viewerId} /></div></article>;
}

export function FeedBoard({ initial, viewerId }: { initial: FeedPage; viewerId: string | null }) {
  const [items, setItems] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/feed?cursor=${encodeURIComponent(cursor)}`, { cache: "no-store" });
      const page = await response.json() as FeedPage & { error?: string };
      if (!response.ok) throw new Error(page.error || "Không thể tải thêm bài viết.");
      setItems((current) => [...current, ...page.items]);
      setCursor(page.nextCursor);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể tải thêm bài viết.");
    } finally { setLoading(false); }
  }

  return <section className="space-y-4" aria-label="Bảng tin cộng đồng">{items.length ? items.map((item) => <FeedCard key={`${item.kind}-${item.id}`} item={item} viewerId={viewerId} />) : <div className="rounded-[24px] border border-dashed border-border bg-white p-8 text-center"><Newspaper className="mx-auto size-9 text-brand/60" /><p className="mt-3 text-sm font-extrabold text-ink">Chưa có bài viết nào</p><p className="mt-1 text-sm text-ink-muted">Bảng tin sẽ hiển thị các bài viết được WEWIN hoặc cộng đồng chia sẻ.</p></div>}{error ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}{cursor ? <button type="button" onClick={() => void loadMore()} disabled={loading} className="mx-auto flex min-h-11 items-center gap-2 rounded-[var(--radius-btn)] border border-brand px-5 text-sm font-extrabold text-brand transition hover:bg-brand-soft disabled:opacity-60">{loading ? <LoaderCircle className="size-4 animate-spin" /> : null}{loading ? "Đang tải…" : "Xem thêm"}</button> : null}</section>;
}
