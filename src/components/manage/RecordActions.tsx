"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Pencil, Trash2, X } from "lucide-react";

export type EditField = { key: string; label: string; value: string; maxLength?: number; options?: { value: string; label: string }[] };

export function RecordActions({ endpoint, title, fields = [], deleteDescription, onSaved, onDeleted, allowDelete = true }: {
  endpoint: string; title: string; fields?: EditField[]; deleteDescription: string; allowDelete?: boolean;
  onSaved?: (values: Record<string, string>) => void; onDeleted?: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [mode, setMode] = useState<"edit" | "delete">("edit");
  const [values, setValues] = useState<Record<string, string>>({});
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  function open(next: "edit" | "delete") {
    setMode(next); setError(""); setConfirmation("");
    setValues(Object.fromEntries(fields.map(field => [field.key, field.value])));
    dialog.current?.showModal();
  }
  async function submit() {
    if (busy || (mode === "delete" && confirmation !== title)) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(endpoint, { method: mode === "delete" ? "DELETE" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(mode === "delete" ? { confirmation } : values) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Không thể lưu thay đổi. Vui lòng thử lại.");
      if (data.warning) window.alert(data.warning);
      setMessage(data.warning || (mode === "delete" ? "Đã xóa dữ liệu." : "Đã lưu thay đổi."));
      dialog.current?.close();
      if (mode === "delete") onDeleted?.(); else onSaved?.(values);
      router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Không thể lưu thay đổi."); }
    finally { setBusy(false); }
  }
  return <div className="flex flex-wrap items-center gap-2">
    {fields.length > 0 && <button type="button" onClick={() => open("edit")} className="admin-action"><Pencil size={16} aria-hidden="true" />Sửa</button>}
    {allowDelete && <button type="button" onClick={() => open("delete")} className="admin-action text-red-700 hover:border-red-300 hover:bg-red-50"><Trash2 size={16} aria-hidden="true" />Xóa</button>}
    {message && <p role="status" className="w-full text-sm text-ink-muted">{message}</p>}
    <dialog ref={dialog} onCancel={(event) => { if (busy) event.preventDefault(); }} className="m-auto max-h-[85dvh] w-[min(92vw,520px)] overflow-y-auto rounded-3xl border border-border bg-white p-6 text-ink shadow-2xl backdrop:bg-slate-950/45" aria-label={`${mode === "edit" ? "Chỉnh sửa" : "Xóa"} ${title}`}>
      <form onSubmit={(event) => { event.preventDefault(); void submit(); }} className="space-y-5">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-brand">Quản lý nội dung</p><h3 className="mt-2 text-xl font-extrabold">{mode === "edit" ? "Chỉnh sửa thông tin" : "Xóa vĩnh viễn?"}</h3><p className="mt-1 break-words text-sm text-ink-muted">{title}</p></div><button type="button" disabled={busy} onClick={() => dialog.current?.close()} className="admin-action shrink-0" aria-label="Đóng"><X size={18} /></button></div>
        {mode === "edit" ? fields.map(field => <label className="block text-sm font-bold" key={field.key}>{field.label}{field.options ? <select className="admin-input mt-2" value={values[field.key] ?? ""} onChange={event => setValues({ ...values, [field.key]: event.target.value })}>{field.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : ["body", "description", "subtitle"].includes(field.key) ? <textarea rows={4} className="admin-input mt-2 resize-y" value={values[field.key] ?? ""} maxLength={field.maxLength ?? 1000} onChange={event => setValues({ ...values, [field.key]: event.target.value })} /> : <input className="admin-input mt-2" value={values[field.key] ?? ""} maxLength={field.maxLength ?? 1000} onChange={event => setValues({ ...values, [field.key]: event.target.value })} />}</label>) : <><p className="rounded-2xl bg-red-50 p-4 text-sm leading-relaxed text-red-800">{deleteDescription} Không thể hoàn tác từ giao diện.</p><label className="block text-sm font-bold">Nhập chính xác tên ở trên để xác nhận<input className="admin-input mt-2" autoComplete="off" value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label></>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap justify-end gap-3"><button type="button" disabled={busy} onClick={() => dialog.current?.close()} className="admin-action">Hủy</button><button disabled={busy || (mode === "delete" && confirmation !== title)} className={`admin-action text-white disabled:opacity-50 ${mode === "delete" ? "bg-red-700 hover:bg-red-800" : "bg-brand hover:bg-brand-dark"}`}>{busy && <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />}{mode === "edit" ? "Lưu thay đổi" : "Xác nhận xóa"}</button></div>
      </form>
    </dialog>
  </div>;
}
