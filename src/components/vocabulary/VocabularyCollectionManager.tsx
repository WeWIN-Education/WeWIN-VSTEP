"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RecordActions } from "@/components/manage/RecordActions";

type CollectionSummary = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sourceFile: string | null;
  createdAt: string;
  topicCount: number;
  entryCount: number;
  importCount: number;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value));
}

export function VocabularyCollectionManager({ initialCollections }: { initialCollections: CollectionSummary[] }) {
  const router = useRouter();
  const [collections, setCollections] = useState(initialCollections);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function removeCollection(collection: CollectionSummary) {
    if (pendingId) return;
    const confirmed = window.confirm(
      `Gỡ bộ “${collection.name}” (${collection.code})?\n\nToàn bộ ${collection.entryCount} mục từ, ${collection.topicCount} chủ đề và tiến độ học liên quan sẽ bị xóa. Lịch sử import của bộ này cũng sẽ được gỡ. Thao tác này không thể hoàn tác.`,
    );
    if (!confirmed) return;

    setError("");
    setPendingId(collection.id);
    try {
      const response = await fetch(`/api/manage/vocabulary/collections/${encodeURIComponent(collection.id)}`, { method: "DELETE" });
      const body = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error || "Không thể gỡ bộ từ vựng.");
      setCollections((current) => current.filter((item) => item.id !== collection.id));
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể gỡ bộ từ vựng.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className="rounded-[24px] border border-border bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-jakarta)] text-lg font-extrabold text-ink">Các bộ từ vựng đã nhập</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">Gỡ một bộ sẽ xóa các chủ đề, mục từ và tiến độ học liên quan.</p>
        </div>
        <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand">{collections.length} bộ</span>
      </div>

      {error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}


      {collections.length ? (
        <div className="mt-5 grid gap-3">
          {collections.map((collection) => (
            <article key={collection.id} className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-surface/40 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wide text-brand">{collection.code}</span>
                  <span className="text-xs text-ink-muted">Nhập {formatDate(collection.createdAt)}</span>
                </div>
                <h3 className="mt-1 truncate font-extrabold text-ink">{collection.name}</h3>
                <p className="mt-1 truncate text-xs text-ink-muted">{collection.sourceFile || collection.description || "Không có mô tả"}</p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-ink-muted">
                  <span>{collection.topicCount} chủ đề</span>
                  <span>{collection.entryCount} mục từ</span>
                  <span>{collection.importCount} lượt nhập</span>
                </div>
              </div>
              <RecordActions endpoint={`/api/manage/vocabulary/collections/${collection.id}`} title={collection.name} allowDelete={false} deleteDescription="" fields={[{ key: "name", label: "Tên bộ", value: collection.name, maxLength: 160 }, { key: "description", label: "Mô tả", value: collection.description ?? "" }]} onSaved={values => setCollections(current => current.map(row => row.id === collection.id ? { ...row, name: values.name, description: values.description } : row))} />
              <button
                type="button"
                onClick={() => void removeCollection(collection)}
                disabled={pendingId !== null}
                className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-btn)] border border-red-200 px-4 text-sm font-extrabold text-red-700 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
              >
                {pendingId === collection.id ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Trash2 className="size-4" aria-hidden="true" />}
                {pendingId === collection.id ? "Đang gỡ…" : "Gỡ bộ"}
              </button>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-2xl bg-surface/60 px-4 py-5 text-sm text-ink-muted">Chưa có bộ từ vựng nào được nhập.</p>
      )}
    </section>
  );
}
