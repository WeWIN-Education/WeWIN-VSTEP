"use client";

import { useState } from "react";

export type VocabularyListEntry = { id: string; term: string; meaningVi: string; partOfSpeech: string | null; ipa: string | null; exampleEn: string | null; exampleVi: string | null; status?: "NEW" | "LEARNING" | "MASTERED" };

const statusLabels = { NEW: "Chưa học", LEARNING: "Đang học", MASTERED: "Đã nhớ" } as const;

export function VocabularyEntryList({ entries }: { entries: VocabularyListEntry[] }) {
  const [items, setItems] = useState(entries);
  const [saving, setSaving] = useState<string | null>(null);

  async function changeStatus(id: string, status: VocabularyListEntry["status"]) {
    if (!status) return;
    setSaving(id);
    try {
      const response = await fetch("/api/vocabulary/progress", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ entryId: id, status }) });
      if (!response.ok) return;
      setItems((current) => current.map((entry) => entry.id === id ? { ...entry, status } : entry));
    } finally {
      setSaving(null);
    }
  }

  return <div className="space-y-3">{items.map((entry) => <article key={entry.id} className="rounded-2xl border border-border bg-white p-4 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-[family-name:var(--font-jakarta)] text-lg font-extrabold text-ink">{entry.term}</h2>{entry.partOfSpeech && <span className="rounded-full bg-brand-soft px-2 py-1 text-[11px] font-bold text-brand">{entry.partOfSpeech}</span>}</div>{entry.ipa && <p className="mt-1 font-mono text-xs text-ink-muted">{entry.ipa}</p>}<p className="mt-2 text-sm text-ink">{entry.meaningVi}</p>{entry.exampleEn && <p className="mt-3 text-sm italic text-ink-muted">{entry.exampleEn}{entry.exampleVi ? ` · ${entry.exampleVi}` : ""}</p>}</div><select aria-label={`Trạng thái ${entry.term}`} value={entry.status ?? "NEW"} disabled={saving === entry.id} onChange={(event) => changeStatus(entry.id, event.target.value as VocabularyListEntry["status"])} className="min-h-10 rounded-xl border border-border bg-white px-3 text-xs font-bold text-ink outline-none focus:border-brand">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div></article>)}</div>;
}
