"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FileUp, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { validateGrammarContent, type GrammarContent } from "@/lib/grammar-rules";
import styles from "./grammar.module.css";
import catalog from "@/data/grammar-catalog.json";

type Row = { id: string; slug: string; title: string; version: string; status: string };
const labels: Record<string, string> = { DRAFT: "Bản nháp", REVIEWED: "Đã duyệt", PUBLISHED: "Đang công bố", ARCHIVED: "Đã lưu trữ" };

export function GrammarManager() {
  const [items, setItems] = useState<Row[]>([]), [selected, setSelected] = useState<Row | null>(null);
  const [editor, setEditor] = useState(""), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [topicSlug, setTopicSlug] = useState(catalog.topics[0].slug);
  const load = useCallback(async () => {
    const response = await fetch("/api/manage/grammar", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    setItems(data);
  }, []);
  useEffect(() => { load().catch(error => setMessage(error.message)); }, [load]);
  async function readContent(url: string, row: Row | null) {
    setBusy(true); setMessage(""); setConfirmed(false);
    try {
      const response = await fetch(url, { cache: "no-store" }), data = await response.json();
      if (!response.ok || data.error || !data) throw new Error(data?.error || "Không tìm thấy nội dung.");
      setEditor(JSON.stringify(row ? data.content : data, null, 2)); setSelected(row);
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }
  async function mutate(action: string) {
    setBusy(true); setMessage("");
    try {
      const payload = action === "import" ? { action, content: JSON.parse(editor) } : { action, id: selected?.id, confirmed };
      const response = await fetch("/api/manage/grammar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Chưa lưu được nội dung.");
      setSelected(data); setConfirmed(false); await load();
      setMessage(action === "import" ? "Đã lưu phiên bản. Nội dung trùng sẽ dùng lại bản có sẵn, không tạo thêm." : "Đã cập nhật trạng thái.");
    } catch (error) { setMessage(error instanceof SyntaxError ? "JSON chưa đúng định dạng. Nội dung bạn nhập vẫn được giữ lại." : (error as Error).message); }
    finally { setBusy(false); }
  }
  let preview: GrammarContent | null = null;
  try { preview = validateGrammarContent(JSON.parse(editor)); } catch { /* Keep invalid draft text editable. */ }
  const canPreview = preview && Array.isArray(preview.sets) && preview.sets.every(s => Array.isArray(s.questions));
  return <div className={styles.workspace}><aside className={`${styles.panel} space-y-4`}><h2 className="font-bold">Nội dung đã nhập</h2><Button variant="outline" size="lg" className="w-full" onClick={() => load().catch(error => setMessage(error.message))}>Tải lại danh sách</Button>{!items.length && <p className="text-sm text-ink-muted">Chưa có nội dung. Chọn một mẫu bên cạnh để bắt đầu.</p>}<div className="max-h-[700px] space-y-2 overflow-y-auto">{items.map(item => <button type="button" key={item.id} disabled={busy} onClick={() => readContent(`/api/manage/grammar?id=${item.id}`, item)} className={`w-full rounded-xl border p-3 text-left ${selected?.id === item.id ? "border-brand bg-brand-soft" : "border-border bg-surface"}`}><strong className="block text-sm">{item.title}</strong><span className="mt-1 block text-xs text-ink-muted">{labels[item.status]} · {item.version.slice(0, 8)}</span></button>)}</div></aside>
    <section className={`${styles.panel} min-w-0 space-y-5`}><h2 className="text-lg font-bold">Nhập và duyệt chuyên đề</h2><p className="text-sm leading-relaxed text-ink-muted">Chọn từ bộ 40 chuyên đề đã biên tập hoặc nhập tệp JSON chuẩn hóa. Word/PowerPoint cần được biên tập thành câu hỏi trước. Sửa nội dung rồi lưu sẽ tạo phiên bản mới, giữ nguyên bài làm cũ.</p>
      <div className="flex flex-wrap items-end gap-3"><label className="min-w-0 flex-1 space-y-2"><span className="block text-sm font-semibold">Nội dung có sẵn</span><select className={styles.input} value={topicSlug} disabled={busy} onChange={event => setTopicSlug(event.target.value)}>{catalog.groups.map(group => <optgroup key={group.id} label={group.title}>{catalog.topics.filter(topic => topic.group === group.id).map(topic => <option key={topic.slug} value={topic.slug}>{String(topic.number).padStart(2, "0")} · {topic.title}</option>)}</optgroup>)}</select></label><Button size="lg" variant="outline" disabled={busy} onClick={() => readContent(`/api/manage/grammar?topic=${topicSlug}`, null)}>Mở nội dung</Button></div>
      <label className="flex min-h-12 flex-wrap cursor-pointer items-center gap-3 rounded-xl border border-dashed border-brand p-3 text-sm font-semibold text-brand"><FileUp className="size-5 shrink-0" aria-hidden="true" /><span>Chọn tệp nội dung JSON</span><input type="file" accept=".json,application/json" className="min-w-0 max-w-full text-xs" disabled={busy} onChange={async event => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 128000) { setMessage("Tệp tối đa 128 KB."); return; } try { setEditor(await file.text()); setSelected(null); setConfirmed(false); } catch { setMessage("Chưa đọc được tệp. Hãy chọn lại."); } event.target.value = ""; }} /></label>
      <details><summary className="cursor-pointer text-sm font-semibold text-brand">Chỉnh nội dung chuẩn hóa</summary><label className="mt-3 block"><span className="mb-2 block text-sm">Nội dung JSON</span><textarea className={`${styles.input} ${styles.editor}`} value={editor} onChange={event => { setEditor(event.target.value); setSelected(null); setConfirmed(false); }} maxLength={128000} spellCheck={false} /></label></details>
      {canPreview && <div className="space-y-4"><h3 className="font-semibold">{preview!.title} · Xem câu hỏi và đáp án</h3><p className="text-sm text-ink-muted">{preview!.source?.note}</p>{preview!.sets.map(set => <details key={set.id} className="rounded-xl border border-border p-4"><summary className="cursor-pointer font-semibold">{set.title} · {set.questions.length} câu</summary><ol className="mt-4 space-y-5">{set.questions.map((q, i) => <li key={q.id} className="space-y-2 text-sm leading-relaxed"><p className="font-semibold">{i + 1}. {q.prompt}</p>{q.options && <p>{q.options.map(o => `${o.id}: ${o.text}`).join(" · ")}</p>}<p className="text-brand">Đáp án: {q.options?.find(o => o.id === q.correctOption)?.text ?? q.accepted?.join(" / ") ?? q.blanks?.map(b => `${b.label}: ${b.accepted.join(" / ")}`).join("; ")}</p>{q.errorTokens && <p>Vị trí lỗi: {q.errorIndexes?.map(n => `${n + 1}: ${q.errorTokens![n]}`).join("; ")}</p>}<p className="text-ink-muted">{q.explanation}</p><p className="text-xs text-ink-muted">Nguồn: {q.source}</p></li>)}</ol></details>)}</div>}
      {message && <p className={styles.note} role="status">{message}</p>}
      <div className="flex flex-wrap gap-3"><Button size="lg" disabled={busy || !editor} onClick={() => mutate("import")}><Save className="size-4" aria-hidden="true" />{busy ? "Đang xử lý…" : "Lưu phiên bản"}</Button>{selected && <Link className="admin-action" href={`/grammar/${selected.slug}?preview=${selected.id}`}>Xem như học viên →</Link>}</div>
      {selected && <div className="space-y-4 border-t border-border pt-5"><p className="text-sm">Trạng thái: <strong>{labels[selected.status]}</strong></p>{selected.status === "DRAFT" && <><label className="flex items-start gap-3 text-sm leading-relaxed"><input type="checkbox" className="mt-1 size-5 shrink-0 accent-[var(--brand)]" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /><span>Tôi đã đối chiếu nguồn, kiểm tra câu hỏi, các đáp án hợp lệ và giải thích của phiên bản này.</span></label><Button size="lg" disabled={busy || !confirmed} onClick={() => mutate("review")}>Duyệt nội dung</Button></>}{selected.status === "REVIEWED" && <Button size="lg" disabled={busy} onClick={() => mutate("publish")}>Công bố cho học viên</Button>}{selected.status === "ARCHIVED" && <Button size="lg" variant="outline" disabled={busy} onClick={() => mutate("restore")}>Khôi phục thành bản nháp</Button>}{selected.status !== "ARCHIVED" && <Button size="lg" variant="outline" className="ml-3" disabled={busy} onClick={() => mutate("archive")}>Lưu trữ phiên bản</Button>}<p className="text-xs leading-relaxed text-ink-muted">Công bố phiên bản mới sẽ lưu trữ bản đang mở của cùng chuyên đề. Không xóa bài làm đã có.</p></div>}
    </section></div>;
}
