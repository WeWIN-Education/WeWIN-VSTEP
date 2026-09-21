"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LearningAudioManager } from "@/components/manage/LearningAudioManager";
import { CONTENT_LEVELS, CONTENT_SKILLS, MAX_CONTENT_BYTES, contentTemplate, type ContentInput, type ContentKind, type ContentRecord } from "@/lib/learning-content";

const endpoint = "/api/manage/learning-content";
const blank = (kind: ContentKind): ContentInput => ({ kind, code: "", title: "", skill: "READING", level: "B1", body: "", published: false });
export function LearningContentManager({ kind }: { kind: ContentKind }) {
  const [items, setItems] = useState<ContentRecord[]>([]);
  const [form, setForm] = useState<ContentInput | ContentRecord>(blank(kind));
  const [editing, setEditing] = useState(false);
  const [q, setQ] = useState("");
  const [skill, setSkill] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState<ContentInput[]>([]);
  const [source, setSource] = useState("");
  const [revision, setRevision] = useState(0);
  const listRequest = useRef(0);
  const editor = useRef<HTMLDivElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const refresh = () => setRevision(n => n + 1);

  useEffect(() => {
    const controller = new AbortController();
    const version = ++listRequest.current;
    const timer = setTimeout(async () => {
      setLoading(true); setError(""); setCursor(null);
      try {
        const response = await fetch(`${endpoint}?${new URLSearchParams({ kind, q, skill })}`, { signal: controller.signal, cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (version === listRequest.current) { setItems(data.items); setCursor(data.nextCursor); }
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Không tải được danh sách."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [kind, q, skill, revision]);

  async function act(method: string, body: unknown) {
    const response = await fetch(endpoint, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Không lưu được nội dung.");
    return data;
  }
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try { await action(); }
    catch (e) { setError(e instanceof Error ? e.message : "Thao tác thất bại."); }
    finally { setBusy(false); }
  }
  function open(item?: ContentRecord) {
    if (editing && !window.confirm("Bỏ nội dung đang sửa để mở bài khác?")) return;
    setForm(item ?? blank(kind)); setEditing(true);
    requestAnimationFrame(() => editor.current?.scrollIntoView({ behavior: "instant", block: "start" }));
  }
  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([contentTemplate(kind)], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `${kind.toLowerCase()}-template.txt`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <div className="space-y-5">
    <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => open()}>Thêm bài</Button><Button variant="outline" disabled={busy} onClick={() => upload.current?.click()}>Upload bộ nội dung</Button><Button variant="ghost" onClick={downloadTemplate}>Tải mẫu TXT</Button></div>
    <p className="text-sm text-ink-muted">Nhập file TXT/Markdown UTF-8 theo mẫu WEWIN, tối đa 2 MB / 100 bài. File nhiều bài được tách theo tiêu đề. Bài nhập mới ở trạng thái ẩn để bạn kiểm tra trước khi mở.</p>
    <input ref={upload} type="file" accept=".txt,.md,text/plain,text/markdown" className="hidden" aria-label="Chọn file nội dung" onChange={e => {
      const file = e.target.files?.[0]; e.target.value = ""; if (!file) return;
      void run(async () => {
        setPreview([]); setSource("");
        if (!/\.(txt|md)$/i.test(file.name) || file.size > MAX_CONTENT_BYTES) throw new Error("Chọn file .txt/.md tối đa 2 MB.");
        const text = await file.text(); const result = await act("POST", { action: "preview", kind, source: text });
        setSource(text); setPreview(result.items);
      });
    }} />
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
    {preview.length > 0 && <Card className="space-y-3"><h2 className="font-bold">Xem trước: {preview.length} bài</h2><ul className="max-h-64 space-y-2 overflow-y-auto text-sm">{preview.map(p => <li key={p.code}><strong>{p.code}</strong> · {p.title} · {p.skill} · {p.level}</li>)}</ul><p className="text-sm text-ink-muted">Mã trùng sẽ báo lỗi; nội dung hiện có không bị ghi đè.</p><div className="flex gap-2"><Button disabled={busy} onClick={() => void run(async () => { const result = await act("POST", { action: "import", kind, source }); setNotice(`Đã nhập ${result.count} bài.`); setPreview([]); setSource(""); refresh(); })}>{busy ? "Đang nhập…" : "Xác nhận nhập"}</Button><Button variant="ghost" disabled={busy} onClick={() => { setPreview([]); setSource(""); }}>Hủy</Button></div></Card>}
    {editing && <div ref={editor}><Card><form className="space-y-4" onSubmit={e => { e.preventDefault(); void run(async () => { await act("id" in form ? "PUT" : "POST", form); setEditing(false); setForm(blank(kind)); setNotice("Đã lưu bài."); refresh(); }); }}>
      <h2 className="text-lg font-bold">{"id" in form ? "Chỉnh sửa bài" : "Thêm bài mới"}</h2>
      <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">Mã bài<input required maxLength={80} pattern="[A-Z0-9_-]+" className="admin-input mt-1" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} /></label>
        <label className="text-sm font-semibold">Tên bài<input required maxLength={200} className="admin-input mt-1" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
        <label className="text-sm font-semibold">Kỹ năng<select className="admin-input mt-1" value={form.skill} onChange={e => setForm({ ...form, skill: e.target.value })}>{CONTENT_SKILLS.map(s => <option key={s}>{s}</option>)}</select></label>
        <label className="text-sm font-semibold">Mức độ<select className="admin-input mt-1" value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}>{CONTENT_LEVELS.map(s => <option key={s}>{s}</option>)}</select></label>
        <label className="text-sm font-semibold sm:col-span-2">Nội dung<textarea required minLength={20} maxLength={120000} rows={18} className="admin-input mt-1 font-mono" value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} /></label>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={form.published} onChange={e => setForm({ ...form, published: e.target.checked })} />Mở cho học viên</label>
      </fieldset>
      <div className="flex gap-2"><Button disabled={busy} type="submit">{busy ? "Đang lưu…" : "Lưu bài"}</Button><Button disabled={busy} variant="ghost" type="button" onClick={() => { if (window.confirm("Bỏ các chỉnh sửa chưa lưu?")) setEditing(false); }}>Hủy</Button></div>
    </form></Card></div>}
    <div className="grid gap-3 sm:grid-cols-[1fr_200px]"><label className="text-sm font-semibold">Tìm tên hoặc mã<input className="admin-input mt-1" value={q} onChange={e => setQ(e.target.value)} /></label><label className="text-sm font-semibold">Lọc kỹ năng<select className="admin-input mt-1" value={skill} onChange={e => setSkill(e.target.value)}><option value="">Tất cả</option>{CONTENT_SKILLS.map(s => <option key={s}>{s}</option>)}</select></label></div>
    {loading ? <p role="status">Đang tải danh sách…</p> : items.length === 0 ? <Card>Chưa có bài phù hợp. Thêm bài hoặc upload bộ nội dung để bắt đầu.</Card> : <div className="space-y-3">{items.map(item => <Card key={item.id} className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0 flex-1"><h2 className="break-words font-bold">{item.title}</h2><p className="mt-1 text-xs text-ink-muted">{item.code} · {item.skill} · {item.level} · {item.published ? "Đang mở" : "Đang ẩn"}</p></div><div className="flex flex-wrap gap-2"><Link className="admin-action" href={`/${kind === "SKILL" ? "training" : "practice"}/content/${item.id}`}>Xem</Link><button className="admin-action" disabled={busy} onClick={() => open(item)}>Sửa</button><button className="admin-action" disabled={busy} onClick={() => void run(async () => { await act("PUT", { ...item, published: !item.published }); setNotice(item.published ? "Đã ẩn bài." : "Đã mở bài."); refresh(); })}>{item.published ? "Ẩn" : "Mở"}</button><button className="admin-action text-red-700" disabled={busy} onClick={() => { if (window.confirm(`Xóa vĩnh viễn “${item.title}” khỏi database? Không thể hoàn tác.`)) void run(async () => { const result = await act("DELETE", item); if ("id" in form && form.id === item.id) setEditing(false); setNotice(result.warning || "Đã xóa bài khỏi database."); refresh(); }); }}>Xóa</button></div><LearningAudioManager item={item} onSaved={message => { setNotice(message); refresh(); }} /></Card>)}</div>}
    {cursor && !loading && <Button disabled={busy} variant="outline" onClick={() => void run(async () => { const version = listRequest.current; const response = await fetch(`${endpoint}?${new URLSearchParams({ kind, q, skill, cursor })}`, { cache: "no-store" }); const data = await response.json(); if (!response.ok) throw new Error(data.error); if (version === listRequest.current) { setItems(old => [...old, ...data.items]); setCursor(data.nextCursor); } })}>Tải thêm</Button>}
  </div>;
}
