"use client";

import { Check, EyeOff, LoaderCircle, RotateCcw, X } from "lucide-react";
import { LinkifiedText } from "@/components/ui/LinkifiedText";
import { useState } from "react";
import { RecordActions } from "@/components/manage/RecordActions";

type ManagedPost = { id: string; title: string | null; body: string; status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN"; createdAt: string; publishedAt: string | null; author: { id: string; name: string | null; email: string } };

const labels: Record<ManagedPost["status"], string> = { DRAFT: "Nháp", PENDING: "Chờ duyệt", APPROVED: "Đã duyệt", REJECTED: "Từ chối", HIDDEN: "Đã ẩn" };

export function PostModerationPanel({ initialPosts }: { initialPosts: ManagedPost[] }) {
  const [posts, setPosts] = useState(initialPosts);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  async function changeStatus(id: string, status: ManagedPost["status"]) {
    setPendingId(id); setError("");
    try {
      const response = await fetch(`/api/manage/posts/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const body = await response.json() as { post?: ManagedPost; error?: string };
      if (!response.ok || !body.post) throw new Error(body.error || "Không thể cập nhật bài viết.");
      setPosts((current) => current.map((post) => post.id === id ? body.post! : post));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Không thể cập nhật bài viết."); }
    finally { setPendingId(null); }
  }
  return <div className="space-y-4">{error ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}{posts.length ? posts.map((post) => <article key={post.id} className="rounded-2xl border border-border bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold text-ink-muted">{post.author.name || post.author.email} · {new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(post.createdAt))}</p><h2 className="mt-2 font-[family-name:var(--font-jakarta)] text-lg font-extrabold text-ink">{post.title || "Không có tiêu đề"}</h2></div><span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-extrabold text-brand">{labels[post.status]}</span></div><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-muted"><LinkifiedText>{post.body}</LinkifiedText></p><div className="mt-4"><RecordActions endpoint={`/api/manage/posts/${post.id}`} title={post.title || "Không có tiêu đề"} fields={[{ key: "title", label: "Tiêu đề", value: post.title ?? "", maxLength: 160 }, { key: "body", label: "Nội dung", value: post.body, maxLength: 10000 }]} deleteDescription="Xóa bài viết, bình luận, lượt thích của bài và ảnh đính kèm." onSaved={values => setPosts(current => current.map(row => row.id === post.id ? { ...row, title: values.title, body: values.body } : row))} onDeleted={() => setPosts(current => current.filter(row => row.id !== post.id))} /></div><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => void changeStatus(post.id, "APPROVED")} disabled={pendingId === post.id} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-emerald-700 px-3 text-xs font-extrabold text-white disabled:opacity-50"><Check className="size-3.5" />Duyệt</button><button type="button" onClick={() => void changeStatus(post.id, "REJECTED")} disabled={pendingId === post.id} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-red-200 px-3 text-xs font-extrabold text-red-700 disabled:opacity-50"><X className="size-3.5" />Từ chối</button><button type="button" onClick={() => void changeStatus(post.id, "HIDDEN")} disabled={pendingId === post.id} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-extrabold text-ink-muted disabled:opacity-50"><EyeOff className="size-3.5" />Ẩn</button><button type="button" onClick={() => void changeStatus(post.id, "PENDING")} disabled={pendingId === post.id} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-extrabold text-ink-muted disabled:opacity-50"><RotateCcw className="size-3.5" />Đưa về chờ duyệt</button>{pendingId === post.id ? <LoaderCircle className="size-4 animate-spin self-center text-brand" /> : null}</div></article>) : <div className="rounded-2xl border border-dashed border-border bg-surface px-5 py-10 text-center text-sm text-ink-muted">Chưa có bài viết cần xử lý.</div>}</div>;
}
