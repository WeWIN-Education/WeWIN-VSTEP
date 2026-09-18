"use client";

import { ArchiveRestore, EyeOff, LoaderCircle } from "lucide-react";
import { useState } from "react";

export function ExamVisibilityButton({ id, title, hidden }: { id: string; title: string; hidden: boolean }) {
  const [busy, setBusy] = useState(false);
  async function toggle() {
    const action = hidden ? "đưa đề lên lại" : "gỡ đề khỏi danh sách học viên";
    if (!window.confirm(`Bạn muốn ${action}? Bài làm cũ và audio vẫn được giữ lại.`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/manage/exams/${encodeURIComponent(id)}/visibility`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ published: hidden }) });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Không cập nhật được trạng thái đề.");
      window.location.reload();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Không cập nhật được trạng thái đề.");
      setBusy(false);
    }
  }
  return <button type="button" onClick={() => void toggle()} disabled={busy} title={`${hidden ? "Đưa lên lại" : "Gỡ đề"}: ${title}`} aria-label={`${hidden ? "Đưa lên lại" : "Gỡ đề"} ${title}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-bold text-ink-muted transition hover:border-brand hover:bg-brand-soft hover:text-brand disabled:cursor-wait disabled:opacity-50">
    {busy ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : hidden ? <ArchiveRestore className="size-3.5" aria-hidden="true" /> : <EyeOff className="size-3.5" aria-hidden="true" />}
    {hidden ? "Đưa lên lại" : "Gỡ đề"}
  </button>;
}
