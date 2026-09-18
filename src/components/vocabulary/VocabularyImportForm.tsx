"use client";

import type { VocabularyImportKind } from "@/lib/vocabulary-import";
import { useRef, useState } from "react";

type Preview = {
  kind: VocabularyImportKind;
  totalRows: number;
  validRows: number;
  errors: { sheet: string; row: number; message: string }[];
  sample: { term: string; meaningVi: string; exampleEn?: string; note?: string; topicName?: string }[];
};

type Summary = { totalRows: number; insertedRows: number; updatedRows: number; skippedRows: number; errorRows: number; errors?: { sheet: string; row: number; message: string }[] };

export function VocabularyImportForm({ kind = "VOCABULARY" }: { kind?: VocabularyImportKind }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<"preview" | "import" | null>(null);

  async function request(mode: "preview" | "import") {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("Vui lòng chọn một file Excel trước khi tiếp tục.");
      return;
    }
    setError("");
    if (mode === "preview") setSummary(null);
    setPending(mode);
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("kind", kind);
      data.append("mode", mode);
      const response = await fetch("/api/manage/vocabulary/import", { method: "POST", body: data });
      const body = await response.json() as Preview & Summary & { error?: string };
      if (!response.ok) throw new Error(body.error || "Không thể xử lý file.");
      if (mode === "preview") setPreview(body);
      else {
        setSummary(body);
        setPreview(null);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể xử lý file.");
    } finally {
      setPending(null);
    }
  }

  const isCollocation = kind === "COLLOCATION";
  return (
    <div className="rounded-[24px] border border-border bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-jakarta)] text-lg font-extrabold text-ink">Chọn workbook</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">{isCollocation ? "Cột bắt buộc: cụm từ. Nghĩa, ví dụ, ghi chú, IPA và chủ đề là tùy chọn." : "Cột bắt buộc: bộ, chủ đề, mã mục từ, cấp độ, từ vựng và nghĩa tiếng Việt."} Giới hạn 10MB.</p>
        </div>
        <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand">Xem trước trước khi ghi</span>
      </div>
      <label className="mt-5 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-brand/30 bg-brand-soft/40 px-4 text-center transition hover:border-brand">
        <input ref={inputRef} type="file" accept=".xlsx" className="sr-only" onChange={(event) => { setFileName(event.target.files?.[0]?.name ?? ""); setPreview(null); setSummary(null); setError(""); }} />
        <span className="text-sm font-bold text-brand">{fileName || "Chọn file .xlsx"}</span>
        <span className="mt-1 text-xs text-ink-muted">{isCollocation ? "Dùng template collocations hoặc workbook hiện có" : "Có thể dùng workbook A1–A2 hoặc B1"}</span>
      </label>
      {error ? <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => void request("preview")} disabled={pending !== null} className="min-h-11 rounded-[var(--radius-btn)] border border-brand px-5 text-sm font-extrabold text-brand disabled:cursor-wait disabled:opacity-60">{pending === "preview" ? "Đang kiểm tra…" : "Kiểm tra file"}</button>
        {preview && preview.validRows > 0 ? <button type="button" onClick={() => void request("import")} disabled={pending !== null} className="min-h-11 rounded-[var(--radius-btn)] bg-brand px-5 text-sm font-extrabold text-white disabled:cursor-wait disabled:opacity-60">{pending === "import" ? "Đang nhập…" : `Xác nhận nhập ${preview.validRows} dòng`}</button> : null}
      </div>
      {preview ? <div className="mt-5 rounded-2xl border border-brand/15 bg-brand-soft/35 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-extrabold text-ink">Kết quả kiểm tra</p><span className="text-xs font-bold text-ink-muted">{preview.validRows}/{preview.totalRows} dòng hợp lệ</span></div>
        {preview.sample.length ? <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead><tr className="border-b border-brand/15 text-[10px] font-extrabold uppercase tracking-wide text-ink-muted"><th className="px-2 py-2">Cụm từ / từ</th><th className="px-2 py-2">Nghĩa</th><th className="px-2 py-2">Ví dụ</th><th className="px-2 py-2">Chủ đề</th></tr></thead><tbody>{preview.sample.map((row, index) => <tr key={`${row.term}-${index}`} className="border-b border-brand/10 last:border-0"><td className="px-2 py-2 font-semibold text-ink">{row.term}</td><td className="px-2 py-2 text-ink-muted">{row.meaningVi || "—"}</td><td className="px-2 py-2 text-ink-muted">{row.exampleEn || "—"}</td><td className="px-2 py-2 text-ink-muted">{row.topicName || "—"}</td></tr>)}</tbody></table></div> : null}
        {preview.errors.length ? <ul className="mt-3 space-y-1 text-xs text-red-700">{preview.errors.slice(0, 8).map((item) => <li key={`${item.sheet}-${item.row}`}>{item.sheet} · hàng {item.row}: {item.message}</li>)}</ul> : <p className="mt-3 text-xs font-semibold text-emerald-800">Không có lỗi cấu trúc trong phần dữ liệu được đọc.</p>}
      </div> : null}
      {summary ? <div className="mt-5 rounded-2xl bg-[#ECFBF3] p-4"><p className="text-sm font-extrabold text-[#1F7A4D]">Đã xử lý {summary.totalRows} dòng</p><div className="mt-2 grid gap-2 text-sm text-ink sm:grid-cols-4"><span>Mới: <b>{summary.insertedRows}</b></span><span>Cập nhật: <b>{summary.updatedRows}</b></span><span>Bỏ qua: <b>{summary.skippedRows}</b></span><span>Lỗi: <b>{summary.errorRows}</b></span></div>{summary.errors?.length ? <ul className="mt-3 space-y-1 text-xs text-red-700">{summary.errors.slice(0, 5).map((item) => <li key={`${item.sheet}-${item.row}`}>{item.sheet} · hàng {item.row}: {item.message}</li>)}</ul> : null}</div> : null}
    </div>
  );
}
