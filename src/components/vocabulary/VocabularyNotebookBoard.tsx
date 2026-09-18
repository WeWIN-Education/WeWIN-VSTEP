"use client";

import { VocabularyFlashcards, type FlashcardEntry } from "@/components/vocabulary/VocabularyFlashcards";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

type NotebookFilter = "ALL" | "NEW" | "LEARNING" | "MASTERED";

const filters: Array<{ id: NotebookFilter; label: string }> = [
  { id: "ALL", label: "Tất cả" },
  { id: "NEW", label: "Mới lưu" },
  { id: "LEARNING", label: "Đang học" },
  { id: "MASTERED", label: "Đã nhớ" },
];

export function VocabularyNotebookBoard({ entries }: { entries: FlashcardEntry[] }) {
  const [items, setItems] = useState(entries);
  const [filter, setFilter] = useState<NotebookFilter>("ALL");
  const [query, setQuery] = useState("");

  const counts = useMemo(
    () => ({
      ALL: items.length,
      NEW: items.filter((entry) => entry.status === "NEW").length,
      LEARNING: items.filter((entry) => entry.status === "LEARNING").length,
      MASTERED: items.filter((entry) => entry.status === "MASTERED").length,
    }),
    [items],
  );

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("vi-VN");
    return items.filter((entry) => {
      const matchesStatus = filter === "ALL" || entry.status === filter;
      const matchesQuery = !normalizedQuery || `${entry.term} ${entry.meaningVi} ${entry.exampleEn ?? ""}`.toLocaleLowerCase("vi-VN").includes(normalizedQuery);
      return matchesStatus && matchesQuery;
    });
  }, [filter, items, query]);

  function updateStatus(id: string, status: NonNullable<FlashcardEntry["status"]>) {
    setItems((current) => current.map((entry) => (entry.id === id ? { ...entry, status } : entry)));
  }

  function removeItem(id: string) {
    setItems((current) => current.filter((entry) => entry.id !== id));
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

      <VocabularyFlashcards
        entries={visibleItems}
        title={`${visibleItems.length} mục từ trong sổ tay`}
        emptyTitle="Không có mục từ trong bộ lọc này"
        emptyDescription="Chọn một trạng thái khác hoặc quay lại chủ đề để lưu thêm từ vào sổ tay."
        onStatusChange={updateStatus}
        onRemove={removeItem}
      />
    </div>
  );
}
