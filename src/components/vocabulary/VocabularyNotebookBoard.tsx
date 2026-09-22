"use client";

import { VocabularyFlashcards, type FlashcardEntry } from "@/components/vocabulary/VocabularyFlashcards";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type NotebookFilter = "ALL" | "NEW" | "LEARNING" | "MASTERED";

const filters: Array<{ id: NotebookFilter; label: string }> = [
  { id: "ALL", label: "Tất cả" },
  { id: "NEW", label: "Mới lưu" },
  { id: "LEARNING", label: "Đang học" },
  { id: "MASTERED", label: "Đã nhớ" },
];

export function VocabularyNotebookBoard({ entries, initialPage, initialCounts, userId }: { entries: FlashcardEntry[]; initialPage: { nextCursor: string | null; previousCursor: string | null }; initialCounts: Record<NotebookFilter, number>; userId: string }) {
  const [page, setPage] = useState({ items: entries, ...initialPage });
  const [counts, setCounts] = useState(initialCounts);
  const [filter, setFilter] = useState<NotebookFilter>("ALL");
  const [query, setQuery] = useState("");

  const endpoint = `/api/vocabulary/entries?${new URLSearchParams({ mode: "notebook", q: query.trim(), status: filter })}`;
  const [loadedEndpoint, setLoadedEndpoint] = useState(endpoint);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const first = useRef(true);
  const countsRequest = useRef<AbortController | null>(null);
  const countsVersion = useRef(0);
  useEffect(() => () => countsRequest.current?.abort(), []);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const version = ++countsVersion.current;
      setError("");
      try {
        const response = await fetch(endpoint, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (!controller.signal.aborted) {
          setPage(data); setLoadedEndpoint(endpoint);
          if (version === countsVersion.current) setCounts(data.counts);
        }
      } catch { if (!controller.signal.aborted) setError("Không tải được sổ tay. Vui lòng thử lại."); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [endpoint, revision]);
  async function refreshCounts() {
    const version = ++countsVersion.current;
    countsRequest.current?.abort();
    const controller = new AbortController();
    countsRequest.current = controller;
    try {
      const response = await fetch("/api/vocabulary/entries?mode=notebook&countsOnly=1", { cache: "no-store", signal: controller.signal });
      if (response.ok) { const data = await response.json(); if (!controller.signal.aborted && version === countsVersion.current) setCounts(data.counts); }
    } catch { /* Saved progress remains valid if counts cannot refresh. */ }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Lọc sổ tay">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={filter === item.id}
            onClick={() => setFilter(item.id)}
            className={cn(
              "inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-xs font-extrabold transition",
              filter === item.id ? "border-brand bg-brand text-white" : "border-border bg-white text-ink-muted hover:border-brand/40 hover:text-brand",
            )}
          >
            {item.label} <span className={cn("rounded-full px-1.5 py-0.5 text-[10px]", filter === item.id ? "bg-white/15 text-white" : "bg-surface text-ink-faint")}>{counts[item.id]}</span>
          </button>
        ))}
      </div>

      <label className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-white px-3 focus-within:border-brand">
        <Search className="size-4 text-ink-muted" aria-hidden="true" />
        <span className="sr-only">Tìm trong sổ tay</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm từ, nghĩa hoặc ví dụ…" className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint" />
      </label>

      {error && <p role="alert">{error}<button className="admin-action" onClick={() => setRevision(n => n + 1)}>Thử lại</button></p>}
      {loadedEndpoint !== endpoint ? <p role="status">Đang tải mục từ…</p> : <VocabularyFlashcards
        key={`${userId}:${loadedEndpoint}`}
        entries={page.items}
        pagination={{ endpoint, sessionKey: `${userId}:${endpoint}`, nextCursor: page.nextCursor, previousCursor: page.previousCursor, notebook: true, status: filter }}
        title="Mục từ trong sổ tay"
        emptyTitle="Không có mục từ trong bộ lọc này"
        emptyDescription="Chọn một trạng thái khác hoặc quay lại chủ đề để lưu thêm từ vào sổ tay."
        onStatusChange={() => void refreshCounts()}
        onRemove={() => void refreshCounts()}
      />}
    </div>
  );
}
