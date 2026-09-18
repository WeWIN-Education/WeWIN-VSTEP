"use client";

import { X } from "lucide-react";
import { useState } from "react";

export type PersonalVocabularyDefaults = {
  term?: string;
  ipa?: string;
  meaningVi?: string;
  exampleEn?: string;
  note?: string;
  tags?: string;
};

export function PersonalVocabularyModal({ defaults = {}, compact = false }: { defaults?: PersonalVocabularyDefaults; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function save(formData: FormData) {
    setPending(true); setError("");
    const body = Object.fromEntries(formData.entries());
    const response = await fetch("/api/vocabulary/personal", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!response.ok) { const data = await response.json().catch(() => ({})); setError(data.error ?? "Không thể lưu mục từ."); setPending(false); return; }
    setPending(false); setOpen(false); window.location.reload();
  }
  return <><button type="button" onClick={() => { setError(""); setOpen(true); }} className={"inline-flex min-h-10 items-center justify-center rounded-xl border border-brand px-3 text-xs font-extrabold text-brand transition hover:bg-brand-soft " + (compact ? "" : "bg-white")}>+ Thêm vào Sổ tay</button>{open && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/45 p-4" role="dialog" aria-modal="true" aria-label="Thêm vào sổ tay"><form action={save} className="w-full max-w-xl rounded-[24px] bg-white p-5 shadow-2xl sm:p-7"><div className="flex items-center justify-between"><div><p className="text-xs font-extrabold uppercase tracking-wide text-brand">XÁC NHẬN TRƯỚC KHI LƯU</p><h2 className="mt-1 text-xl font-semibold text-ink">Thêm vào Sổ tay</h2></div><button type="button" onClick={() => setOpen(false)} aria-label="Đóng"><X className="size-5 text-ink-muted" /></button></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Từ/cụm từ *" name="term" required defaultValue={defaults.term} /><Field label="IPA" name="ipa" defaultValue={defaults.ipa} /><Field label="Nghĩa tiếng Việt *" name="meaningVi" required wide defaultValue={defaults.meaningVi} /><Field label="Câu ví dụ" name="exampleEn" wide defaultValue={defaults.exampleEn} /><label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-medium text-ink">Ghi chú riêng</span><textarea name="note" defaultValue={defaults.note} rows={3} placeholder="Ví dụ: dùng khi nhắc học sinh" className="w-full rounded-xl border border-border p-3 text-sm outline-none focus:border-brand" /></label><Field label="Thẻ" name="tags" wide placeholder="classroom, vstep" defaultValue={defaults.tags} /></div>{error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}<div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-xl px-4 text-sm font-bold text-ink-muted">Hủy</button><button disabled={pending} className="min-h-11 rounded-[var(--radius-btn)] bg-brand px-5 text-sm font-extrabold text-white disabled:opacity-50">{pending ? "Đang lưu…" : "Xác nhận lưu"}</button></div></form></div>}</>;
}

function Field({ label, name, required, wide, placeholder, defaultValue }: { label: string; name: string; required?: boolean; wide?: boolean; placeholder?: string; defaultValue?: string }) { return <label className={wide ? "sm:col-span-2" : ""}><span className="mb-1.5 block text-sm font-medium text-ink">{label}</span><input name={name} required={required} defaultValue={defaultValue} placeholder={placeholder} className="h-11 w-full rounded-xl border border-border px-3 text-sm outline-none focus:border-brand" /></label>; }
