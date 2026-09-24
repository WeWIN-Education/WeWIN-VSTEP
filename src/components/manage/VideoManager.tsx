"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type VideoRecord = {
  id: string; slug: string; title: string; titleVi: string | null; description: string | null; youtubeId: string; sourceUrl: string | null;
  level: string | null; category: string | null; duration: string | null; transcript: unknown; questions: unknown; published: boolean; status: string; errorMessage: string | null; ipaDialect: string | null; updatedAt: string;
};
type Form = { id?: string; sourceUrl: string; title: string; titleVi: string; description: string; level: string; category: string; duration: string; ipaDialect: string; published: boolean; transcriptJson: string; questionsJson: string };
const blank: Form = { sourceUrl: "", title: "", titleVi: "", description: "", level: "B1", category: "Luyện nghe", duration: "", ipaDialect: "en-US", published: false, transcriptJson: "[]", questionsJson: "[]" };

function pretty(value: unknown) { return JSON.stringify(value ?? [], null, 2); }

export function VideoManager() {
  const [items, setItems] = useState<VideoRecord[]>([]);
  const [form, setForm] = useState<Form>(blank);
  const [sourceText, setSourceText] = useState("");
  const [sourceTranscriptJson, setSourceTranscriptJson] = useState("");
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/manage/videos?q=${encodeURIComponent(query)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setItems(data.items);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không tải được kho video."); }
    finally { setLoading(false); }
  }, [query]);
  useEffect(() => { const timer = setTimeout(() => void load(), 180); return () => clearTimeout(timer); }, [load]);

  function open(item?: VideoRecord) {
    setError(""); setNotice(""); setSourceText(""); setSourceTranscriptJson(""); setEditing(true);
    if (!item) { setForm(blank); return; }
    setForm({ id: item.id, sourceUrl: item.sourceUrl || `https://www.youtube.com/watch?v=${item.youtubeId}`, title: item.title, titleVi: item.titleVi || "", description: item.description || "", level: item.level || "B1", category: item.category || "Luyện nghe", duration: item.duration || "", ipaDialect: item.ipaDialect || "en-US", published: item.published, transcriptJson: pretty(item.transcript), questionsJson: pretty(item.questions) });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const base = { sourceUrl: form.sourceUrl, title: form.title, titleVi: form.titleVi, description: form.description, level: form.level, category: form.category, duration: form.duration, ipaDialect: form.ipaDialect, published: form.published };
      const body: Record<string, unknown> = form.id ? { ...base, id: form.id, transcript: JSON.parse(form.transcriptJson), questions: JSON.parse(form.questionsJson) } : { ...base, ...(sourceTranscriptJson ? { transcript: JSON.parse(sourceTranscriptJson) } : {}), transcriptSource: sourceText };
      const response = await fetch("/api/manage/videos", { method: form.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setNotice(data.warning || (form.id ? "Đã lưu video." : "Đã thêm video. Hệ thống đã tạo transcript và nội dung nháp.")); setEditing(false); setForm(blank); setSourceText(""); setSourceTranscriptJson(""); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không lưu được video. Kiểm tra JSON transcript và câu hỏi."); }
    finally { setBusy(false); }
  }

  async function toggle(item: VideoRecord) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/manage/videos", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, title: item.title, titleVi: item.titleVi, description: item.description, level: item.level, category: item.category, duration: item.duration, ipaDialect: item.ipaDialect, published: !item.published, transcript: item.transcript, questions: item.questions }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setNotice(item.published ? "Đã ẩn video." : "Đã xuất bản video."); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không đổi được trạng thái video."); }
    finally { setBusy(false); }
  }

  return <div className="space-y-5">
    <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => open()}>Thêm video YouTube</Button><Button variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>Chọn phụ đề hoặc âm thanh</Button><input ref={fileRef} type="file" accept=".srt,.vtt,.txt,audio/*,video/*" className="hidden" onChange={async (event) => { const file = event.target.files?.[0]; event.target.value = ""; if (!file) return; open(); if (file.type.startsWith("audio/") || file.type.startsWith("video/")) { setBusy(true); setError(""); try { const data = new FormData(); data.append("file", file); const response = await fetch("/api/manage/videos/transcribe-audio", { method: "POST", body: data }); const result = await response.json(); if (!response.ok) throw new Error(result.error); setSourceTranscriptJson(JSON.stringify(result.transcript)); setNotice(`Đã nhận dạng ${file.name}. Dán link YouTube để gắn transcript.`); } catch (cause) { setError(cause instanceof Error ? cause.message : "Không nhận dạng được tệp."); } finally { setBusy(false); } } else { setSourceText(await file.text()); setNotice(`Đã nạp phụ đề ${file.name}. Các dòng EN/IPA/VI sẽ được giữ nguyên khi lưu.`); } }} /></div>
    <p className="text-sm text-ink-muted">Dán link YouTube để hệ thống thử lấy phụ đề. Nếu không được, chọn SRT/VTT/TXT hoặc âm thanh tối đa 25 MB. SRT có thể dùng các dòng <code>EN:</code>, <code>IPA:</code>, <code>VI:</code>; nếu thiếu IPA hoặc bản dịch, AI sẽ bổ sung thành bản nháp.</p>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
    {editing && <Card><form className="space-y-4" onSubmit={save}><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold">{form.id ? "Chỉnh sửa video" : "Thêm video mới"}</h2><button type="button" className="text-sm font-bold text-ink-muted" onClick={() => setEditing(false)}>Đóng</button></div><fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-semibold sm:col-span-2">Link YouTube<input required className="admin-input mt-1" value={form.sourceUrl} onChange={event => setForm({ ...form, sourceUrl: event.target.value })} placeholder="https://www.youtube.com/watch?v=..." /></label>
      <label className="text-sm font-semibold">Tên hiển thị<input maxLength={200} className="admin-input mt-1" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="Để trống để lấy tên YouTube" /></label>
      <label className="text-sm font-semibold">Tên tiếng Việt<input maxLength={200} className="admin-input mt-1" value={form.titleVi} onChange={event => setForm({ ...form, titleVi: event.target.value })} /></label>
      <label className="text-sm font-semibold">Trình độ<input maxLength={20} className="admin-input mt-1" value={form.level} onChange={event => setForm({ ...form, level: event.target.value })} /></label>
      <label className="text-sm font-semibold">Chủ đề<input maxLength={80} className="admin-input mt-1" value={form.category} onChange={event => setForm({ ...form, category: event.target.value })} /></label>
      <label className="text-sm font-semibold">Thời lượng<input maxLength={20} className="admin-input mt-1" value={form.duration} onChange={event => setForm({ ...form, duration: event.target.value })} placeholder="Tự lấy nếu có phụ đề" /></label>
      <label className="text-sm font-semibold">IPA<select className="admin-input mt-1" value={form.ipaDialect} onChange={event => setForm({ ...form, ipaDialect: event.target.value })}><option value="en-US">Anh–Mỹ</option><option value="en-GB">Anh–Anh</option></select></label>
      <label className="text-sm font-semibold sm:col-span-2">Mô tả<textarea maxLength={1000} rows={3} className="admin-input mt-1" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></label>
      {form.id && <><label className="text-sm font-semibold sm:col-span-2">Transcript JSON<textarea required rows={10} className="admin-input mt-1 font-mono text-xs" value={form.transcriptJson} onChange={event => setForm({ ...form, transcriptJson: event.target.value })} /></label><label className="text-sm font-semibold sm:col-span-2">Câu hỏi JSON<textarea rows={8} className="admin-input mt-1 font-mono text-xs" value={form.questionsJson} onChange={event => setForm({ ...form, questionsJson: event.target.value })} /></label></>}
      {!form.id && (sourceText || sourceTranscriptJson) && <p className="rounded-xl bg-brand-soft p-3 text-sm text-brand sm:col-span-2">Đã sẵn sàng dùng nguồn transcript dự phòng.</p>}
      <label className="flex min-h-11 items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={form.published} onChange={event => setForm({ ...form, published: event.target.checked })} />Xuất bản ngay sau khi tạo</label>
    </fieldset><div className="flex gap-2"><Button disabled={busy} type="submit">{busy ? "Đang xử lý…" : form.id ? "Lưu thay đổi" : "Tạo bản nháp"}</Button><Button variant="ghost" disabled={busy} type="button" onClick={() => setEditing(false)}>Hủy</Button></div></form></Card>}
    <label className="block text-sm font-semibold">Tìm video<input className="admin-input mt-1" value={query} onChange={event => setQuery(event.target.value)} placeholder="Tên hoặc slug" /></label>
    {loading ? <p role="status">Đang tải kho video…</p> : items.length === 0 ? <Card>Chưa có video trong kho.</Card> : <div className="space-y-3">{items.map(item => <Card key={item.id} className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0 flex-1"><h2 className="break-words font-bold">{item.title}</h2><p className="mt-1 text-xs text-ink-muted">{item.level || "—"} · {item.category || "—"} · {item.status} · {item.transcript && Array.isArray(item.transcript) ? `${item.transcript.length} câu` : "Chưa có transcript"}</p>{item.errorMessage && <p className="mt-1 text-xs text-amber-700">{item.errorMessage}</p>}</div><div className="flex flex-wrap gap-2"><button className="admin-action" disabled={busy} onClick={() => open(item)}>Sửa</button><button className="admin-action" disabled={busy} onClick={() => void toggle(item)}>{item.published ? "Ẩn" : "Xuất bản"}</button></div></Card>)}</div>}
  </div>;
}
