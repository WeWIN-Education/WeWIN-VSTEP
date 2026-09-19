"use client";

import Link from "next/link";
import { LinkifiedText } from "@/components/ui/LinkifiedText";
import { useState, type FormEvent } from "react";
import { Heart, LoaderCircle, MessageCircle, Send } from "lucide-react";
import type { FeedItem } from "@/lib/feed";

type FeedComment = {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string | null };
};

function commentDateLabel(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function PostInteractions({ item, viewerId }: { item: FeedItem; viewerId: string | null }) {
  const [likeCount, setLikeCount] = useState(item.likeCount);
  const [liked, setLiked] = useState(item.viewerLiked);
  const [commentCount, setCommentCount] = useState(item.commentCount);
  const [likePending, setLikePending] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [commentPending, setCommentPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const endpoint = `/api/posts/${encodeURIComponent(item.id)}`;

  async function toggleLike() {
    if (!viewerId) {
      setNotice("Đăng nhập để thả tim bài viết.");
      return;
    }
    setLikePending(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch(`${endpoint}/like?kind=${item.kind}`, { method: "POST" });
      const data = await response.json().catch(() => ({})) as { error?: string; liked?: boolean; likeCount?: number };
      if (!response.ok) throw new Error(data.error || "Không thể cập nhật lượt tim.");
      setLiked(Boolean(data.liked));
      if (typeof data.likeCount === "number") setLikeCount(data.likeCount);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể cập nhật lượt tim.");
    } finally {
      setLikePending(false);
    }
  }

  async function toggleComments() {
    const nextOpen = !commentsOpen;
    setCommentsOpen(nextOpen);
    setNotice("");
    setError("");
    if (!nextOpen || commentsLoaded || commentsLoading) return;
    setCommentsLoading(true);
    try {
      const response = await fetch(`${endpoint}/comments?kind=${item.kind}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({})) as { error?: string; comments?: FeedComment[] };
      if (!response.ok) throw new Error(data.error || "Không thể tải bình luận.");
      setComments(data.comments || []);
      setCommentsLoaded(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể tải bình luận.");
    } finally {
      setCommentsLoading(false);
    }
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!viewerId) {
      setNotice("Đăng nhập để bình luận bài viết.");
      return;
    }
    const body = commentBody.trim();
    if (!body) return;
    setCommentPending(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch(`${endpoint}/comments?kind=${item.kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string; comment?: FeedComment };
      if (!response.ok || !data.comment) throw new Error(data.error || "Không thể gửi bình luận.");
      setComments((current) => [...current, data.comment as FeedComment]);
      setCommentsLoaded(true);
      setCommentCount((current) => current + 1);
      setCommentBody("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể gửi bình luận.");
    } finally {
      setCommentPending(false);
    }
  }

  return <div className="mt-5 border-t border-border pt-4"><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => void toggleLike()} disabled={likePending} aria-pressed={liked} aria-label={liked ? "Bỏ tim bài viết" : "Thả tim bài viết"} className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-extrabold transition disabled:opacity-60 ${liked ? "bg-rose-50 text-rose-600" : "border border-border text-ink-muted hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"}`}>{likePending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Heart className={`size-4 ${liked ? "fill-current" : ""}`} aria-hidden="true" />}{likeCount} <span className="sr-only">lượt tim</span></button><button type="button" onClick={() => void toggleComments()} aria-expanded={commentsOpen} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-extrabold text-ink-muted transition hover:border-brand/30 hover:bg-brand-soft hover:text-brand"><MessageCircle className="size-4" aria-hidden="true" />{commentCount} <span className="sr-only">bình luận</span></button></div>{notice ? <p role="status" className="mt-3 rounded-xl bg-brand-soft px-3 py-2 text-sm text-brand">{notice} <Link className="font-extrabold underline" href={`/login?callbackUrl=${encodeURIComponent("/feed")}`}>Đăng nhập</Link></p> : null}{error ? <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}{commentsOpen ? <section className="mt-4 rounded-2xl bg-surface p-4" aria-label={`Bình luận cho ${item.title}`}><h3 className="flex items-center gap-2 text-sm font-extrabold text-ink"><MessageCircle className="size-4 text-brand" aria-hidden="true" />Bình luận</h3>{commentsLoading ? <div className="mt-4 flex items-center gap-2 text-sm text-ink-muted"><LoaderCircle className="size-4 animate-spin" />Đang tải bình luận…</div> : comments.length ? <div className="mt-3 space-y-3">{comments.map((comment) => <article key={comment.id} className="rounded-xl border border-border bg-white px-3 py-2.5"><div className="flex flex-wrap items-center gap-2 text-xs"><span className="font-extrabold text-ink">{comment.author.name || "Thành viên"}</span><span className="text-ink-faint">·</span><time className="text-ink-faint" dateTime={comment.createdAt}>{commentDateLabel(comment.createdAt)}</time></div><p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-muted"><LinkifiedText>{comment.body}</LinkifiedText></p></article>)}</div> : <p className="mt-3 text-sm text-ink-muted">Chưa có bình luận. Hãy là người đầu tiên chia sẻ ý kiến.</p>}{viewerId ? <form onSubmit={(event) => void submitComment(event)} className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end"><label className="min-w-0 flex-1"><span className="sr-only">Viết bình luận</span><textarea value={commentBody} onChange={(event) => setCommentBody(event.target.value)} maxLength={1000} rows={2} className="w-full resize-none rounded-xl border border-border bg-white p-3 text-sm leading-relaxed outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" placeholder="Viết bình luận của bạn…" /></label><button type="submit" disabled={commentPending || !commentBody.trim()} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-extrabold text-white transition hover:bg-brand-dark disabled:opacity-50">{commentPending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}{commentPending ? "Đang gửi…" : "Gửi"}</button></form> : <p className="mt-4 rounded-xl border border-dashed border-brand/30 bg-white px-3 py-2.5 text-sm text-ink-muted">Đăng nhập để tham gia bình luận.</p>}</section> : null}</div>;
}
