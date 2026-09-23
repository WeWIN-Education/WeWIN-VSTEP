"use client";
import { useEffect, useState } from "react";
import { BATTLE_TYPES, TYPE_LABELS, type BattleQuestionInput } from "@/lib/battle-rules";
type Question = BattleQuestionInput & { id?: string };
const blank = (): Question => ({ type: "VOCABULARY", difficulty: 1, prompt: "", options: ["", "", "", ""], correct: 0, explanation: "", published: false });
const control = "min-h-11 rounded-xl border-2 border-border bg-white px-3 py-2 text-ink disabled:opacity-50";
export function BattleQuestionManager() {
  const [items, setItems] = useState<Question[]>([]), [form, setForm] = useState<Question>(blank);
  const [q, setQ] = useState(""), [type, setType] = useState(""), [page, setPage] = useState(1), [total, setTotal] = useState(0);
  const [revision, setRevision] = useState(0), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [counts, setCounts] = useState<Array<{ type: string; _count: number }>>([]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/manage/battle?${new URLSearchParams({ q, type, page: String(page) })}`, { signal: controller.signal, cache: "no-store" }).then(async r => { const data = await r.json(); if (!r.ok) throw new Error(data.error); return data; }).then(data => { setItems(data.items); setTotal(data.total); setCounts(data.counts); }).catch(e => { if (!controller.signal.aborted) setMessage(e.message); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [q, type, page, revision]);
  async function save(body: unknown) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/manage/battle", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Không lưu được câu hỏi.");
      setMessage(data.imported !== undefined ? `Đã thêm ${data.imported} câu. Nội dung đã có được giữ nguyên.` : "Đã lưu thay đổi.");
      setRevision(v => v + 1); setForm(blank());
    } catch (e) { setMessage(e instanceof Error ? e.message : "Không lưu được."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-6">
    <section className="rounded-2xl border-2 border-border bg-white p-5"><h2 className="text-xl font-bold">Ngân hàng câu hỏi B1</h2><p className="my-3 text-sm">WEWIN tự biên soạn theo định hướng VSTEP. Cần ít nhất 10 câu xuất bản mỗi dạng trước khi mở ghép trận.</p><div className="mb-4 flex flex-wrap gap-3">{BATTLE_TYPES.map(t => <span key={t}>{TYPE_LABELS[t]}: {counts.find(c => c.type === t)?._count ?? 0} đã xuất bản</span>)}</div><button className={control} disabled={busy} onClick={() => void save({ action: "import" })}>Nạp bộ khởi đầu 150 câu</button></section>
    {message && <p role="status" className="rounded-xl border-2 border-brand bg-brand-soft p-4">{message}</p>}
    <form className="grid gap-4 rounded-2xl border-2 border-border bg-white p-5" onSubmit={e => { e.preventDefault(); void save(form); }}>
      <h2 className="text-xl font-bold">{form.id ? "Sửa câu hỏi" : "Thêm câu hỏi"}</h2><div className="grid gap-4 md:grid-cols-2"><label className="grid gap-1">Dạng<select className={control} value={form.type} onChange={e => setForm({ ...form, type: e.target.value as Question["type"] })}>{BATTLE_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}</select></label><label className="grid gap-1">Độ khó trong B1<select className={control} value={form.difficulty} onChange={e => setForm({ ...form, difficulty: Number(e.target.value) })}><option value={1}>1 · Cơ bản</option><option value={2}>2 · Vừa</option><option value={3}>3 · Nâng cao</option></select></label></div>
      <label className="grid gap-1">Đề câu hỏi (tối đa 240 ký tự)<textarea className={control} required maxLength={240} value={form.prompt} onChange={e => setForm({ ...form, prompt: e.target.value })} /></label>
      <div className="grid gap-4 md:grid-cols-2">{form.options.map((value, i) => <label className="grid gap-1" key={i}>Lựa chọn {String.fromCharCode(65 + i)}<input className={control} required maxLength={90} value={value} onChange={e => setForm({ ...form, options: form.options.map((o, j) => j === i ? e.target.value : o) })} /></label>)}</div>
      <label className="grid gap-1">Đáp án đúng<select className={control} value={form.correct} onChange={e => setForm({ ...form, correct: Number(e.target.value) })}>{form.options.map((_, i) => <option key={i} value={i}>{String.fromCharCode(65 + i)}</option>)}</select></label>
      <label className="grid gap-1">Giải thích tiếng Việt<textarea className={control} required maxLength={1200} value={form.explanation} onChange={e => setForm({ ...form, explanation: e.target.value })} /></label><label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={form.published} onChange={e => setForm({ ...form, published: e.target.checked })} />Xuất bản</label><div className="flex gap-3"><button className={`${control} font-bold`} disabled={busy}>Lưu câu hỏi</button><button className={control} type="button" onClick={() => setForm(blank())}>Tạo mới / Hủy sửa</button></div>
    </form>
    <section className="space-y-4"><h2 className="text-xl font-bold">Danh sách câu hỏi ({total})</h2><div className="flex flex-wrap gap-3"><label className="grid gap-1">Tìm nội dung<input className={control} value={q} onChange={e => { setQ(e.target.value); setPage(1); }} /></label><label className="grid gap-1">Lọc dạng<select className={control} value={type} onChange={e => { setType(e.target.value); setPage(1); }}><option value="">Tất cả</option>{BATTLE_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}</select></label></div>
      {items.map(item => <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-border bg-white p-4"><div className="min-w-0 flex-1"><p className="font-semibold">{item.prompt}</p><small>{TYPE_LABELS[item.type]} · Độ khó {item.difficulty} · {item.published ? "Đã xuất bản" : "Nháp"}</small></div><button className={control} onClick={() => { setForm(item); window.scrollTo({ top: 0 }); }}>Sửa</button><button className={control} disabled={busy} onClick={() => { if (window.confirm("Xóa câu hỏi này? Trận đã tạo vẫn giữ bản câu hỏi cũ.")) void save({ action: "delete", id: item.id }); }}>Xóa</button></article>)}
      <div className="flex items-center justify-center gap-3"><button className={control} disabled={page === 1} onClick={() => setPage(p => p - 1)}>Trước</button><span>Trang {page} / {Math.max(1, Math.ceil(total / 20))}</span><button className={control} disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>Sau</button></div>
    </section>
  </div>;
}
