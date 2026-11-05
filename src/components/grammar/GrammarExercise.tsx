"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { GrammarAnswer, GrammarResult, PublicQuestion } from "@/lib/grammar-rules";
import type { getGrammarExercise, GrammarSubmission } from "@/lib/grammar";
import styles from "./grammar.module.css";

type Exercise = Awaited<ReturnType<typeof getGrammarExercise>>;
const empty = (q: PublicQuestion): GrammarAnswer => q.type === "PASSAGE_CLOZE" ? { blanks: Object.fromEntries(q.blanks!.map(b => [b.id, ""])) } : q.type === "ERROR_CORRECTION" ? { indexes: [], correction: "" } : q.type === "WORD_ORDER" ? { tokenIds: [] } : "";
const initialAnswers = (questions: PublicQuestion[]) => Object.fromEntries(questions.map(q => [q.id, empty(q)]));
function validDraft(questions: PublicQuestion[], value: unknown): value is Record<string, GrammarAnswer> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const answers = value as Record<string, unknown>;
  if (Object.keys(answers).sort().join() !== questions.map(q => q.id).sort().join()) return false;
  const text = (v: unknown) => typeof v === "string" && v.length <= 500;
  return questions.every(q => {
    const answer = answers[q.id];
    if (["MCQ", "BINARY_CHOICE", "FILL_BLANK", "SENTENCE_REWRITE"].includes(q.type)) return text(answer);
    if (!answer || typeof answer !== "object" || Array.isArray(answer)) return false;
    const item = answer as Record<string, unknown>;
    if (q.type === "PASSAGE_CLOZE") return Boolean(item.blanks && typeof item.blanks === "object" && !Array.isArray(item.blanks) && q.blanks!.every(b => text((item.blanks as Record<string, unknown>)[b.id])));
    if (q.type === "ERROR_CORRECTION") return text(item.correction) && Array.isArray(item.indexes) && item.indexes.every(i => Number.isInteger(i) && i >= 0 && i < q.errorTokens!.length);
    return Array.isArray(item.tokenIds) && new Set(item.tokenIds).size === item.tokenIds.length && item.tokenIds.every(id => q.tokens!.some(t => t.id === id));
  });
}

function QuestionInput({ q, value, onChange, disabled }: { q: PublicQuestion; value: GrammarAnswer; onChange: (v: GrammarAnswer) => void; disabled: boolean }) {
  if (q.type === "MCQ" || q.type === "BINARY_CHOICE") return <div className={styles.choices}>{q.options!.map(option => <label key={`${q.id}:${option.id}`} className={styles.choice} data-selected={value === option.id}><input type="radio" name={q.id} value={option.id} checked={value === option.id} onChange={() => onChange(option.id)} disabled={disabled} /><span>{option.text}</span></label>)}</div>;
  if (q.type === "PASSAGE_CLOZE") {
    const answer = value as { blanks: Record<string, string> };
    return <p className="mt-5 text-lg leading-loose">{q.prompt.split(/(\{\{[a-z0-9-]+\}\})/g).map((part, index) => {
      const blank = q.blanks!.find(b => `{{${b.id}}}` === part);
      return blank ? <label key={blank.id} className="mx-1 inline-block max-w-full align-middle"><span className="block text-xs text-ink-muted">{blank.label}</span><input className={styles.input} aria-label={blank.label} value={answer.blanks[blank.id] ?? ""} maxLength={500} disabled={disabled} onChange={event => onChange({ blanks: { ...answer.blanks, [blank.id]: event.target.value } })} autoComplete="off" /></label> : <span key={index}>{part}</span>;
    })}</p>;
  }
  if (q.type === "ERROR_CORRECTION") {
    const answer = value as { indexes: number[]; correction: string };
    return <div className="mt-6 space-y-5"><div className="flex flex-wrap gap-2" role="group" aria-label="Chọn vị trí cần sửa">{q.errorTokens!.map((token, i) => <button type="button" key={`${q.id}:${i}`} className={styles.chip} disabled={disabled} aria-label={`Từ ${i + 1}: ${token}`} aria-pressed={answer.indexes.includes(i)} onClick={() => onChange({ ...answer, indexes: answer.indexes.includes(i) ? answer.indexes.filter(v => v !== i) : [...answer.indexes, i] })}>{token}</button>)}</div><label className="block space-y-2"><span className="text-sm font-semibold">Viết phần sửa đúng</span><input className={styles.input} value={answer.correction} maxLength={500} disabled={disabled} onChange={event => onChange({ ...answer, correction: event.target.value })} autoComplete="off" /></label></div>;
  }
  if (q.type === "WORD_ORDER") {
    const answer = value as { tokenIds: string[] };
    return <div className="mt-5"><p className="text-sm text-ink-muted">Chọn thẻ theo thứ tự. Chạm thẻ đã chọn để bỏ ra.</p><div className={styles.answerArea} aria-label="Câu đã sắp xếp"><div className="flex flex-wrap gap-2">{answer.tokenIds.map(id => <button key={id} type="button" className={styles.chip} disabled={disabled} aria-label={`Bỏ thẻ ${q.tokens!.find(t => t.id === id)!.text}`} onClick={() => onChange({ tokenIds: answer.tokenIds.filter(v => v !== id) })}>{q.tokens!.find(t => t.id === id)!.text}</button>)}</div></div><div className="flex flex-wrap gap-2">{q.tokens!.map(token => <button type="button" key={`${q.id}:${token.id}`} className={styles.chip} disabled={disabled || answer.tokenIds.includes(token.id)} onClick={() => onChange({ tokenIds: [...answer.tokenIds, token.id] })}>{token.text}</button>)}</div></div>;
  }
  return <label className="mt-6 block space-y-3">{q.starter && <span className="block rounded-xl bg-brand-soft p-3 text-sm text-ink">Bắt đầu bằng: <strong>{q.starter}</strong>. Bạn có thể nhập phần còn lại hoặc cả câu.</span>}<span className="block text-sm font-semibold">Câu trả lời của bạn</span>{q.type === "SENTENCE_REWRITE" ? <textarea className={styles.input} rows={3} value={value as string} maxLength={500} disabled={disabled} onChange={event => onChange(event.target.value)} autoComplete="off" /> : <input className={styles.input} value={value as string} maxLength={500} disabled={disabled} onChange={event => onChange(event.target.value)} autoComplete="off" />}</label>;
}

export function GrammarExercise({ exercise, userId }: { exercise: Exercise; userId: string }) {
  const [answers, setAnswers] = useState<Record<string, GrammarAnswer>>(() => initialAnswers(exercise.questions));
  const [index, setIndex] = useState(0), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [result, setResult] = useState<GrammarResult | null>(null), [pending, setPending] = useState<GrammarSubmission | null>(null);
  const hydrated = useRef(false), resultHeading = useRef<HTMLHeadingElement>(null);
  const key = `wewin:grammar:${userId}:${exercise.lessonId}:${exercise.setId}:${exercise.mode}:${exercise.preview ? "preview" : "learn"}`;
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(key);
      const saved = raw && raw.length < 32000 ? JSON.parse(raw) : null;
      if (saved?.version === exercise.version && validDraft(exercise.questions, saved.answers)) {
        const pending = saved.pending;
        setAnswers(saved.answers);
        if (pending && typeof pending.submissionId === "string" && pending.lessonId === exercise.lessonId && pending.version === exercise.version && pending.setId === exercise.setId && pending.mode === exercise.mode && validDraft(exercise.questions, pending.answers)) setPending(pending);
        setIndex(Math.min(exercise.questions.length - 1, Math.max(0, Math.floor(Number(saved.index) || 0))));
      }
    } catch { /* A damaged local draft does not block a fresh exercise. */ }
    hydrated.current = true;
  }, [key, exercise.version, exercise.questions, exercise.lessonId, exercise.setId, exercise.mode]);
  useEffect(() => {
    if (!hydrated.current) return;
    try { if (result) sessionStorage.removeItem(key); else sessionStorage.setItem(key, JSON.stringify({ version: exercise.version, answers, pending, index })); } catch { /* Server submission remains available when local storage is full. */ }
  }, [key, exercise.version, answers, pending, index, result]);
  useEffect(() => { if (result) resultHeading.current?.focus(); }, [result]);

  async function submit() {
    if (busy) return;
    setBusy(true); setError("");
    const payload = pending ?? { submissionId: crypto.randomUUID(), lessonId: exercise.lessonId, version: exercise.version, setId: exercise.setId, mode: exercise.mode, answers };
    setPending(payload);
    try {
      const response = await fetch("/api/grammar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, preview: exercise.preview }) });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 400) setPending(null);
        throw new Error(data.error || "Chưa lưu được bài.");
      }
      setResult(data); setPending(null);
    } catch (error) { setError(error instanceof Error ? error.message : "Mất kết nối. Câu trả lời vẫn được giữ lại, hãy thử gửi lại."); }
    finally { setBusy(false); }
  }
  const question = exercise.questions[index];
  const backHref = `/grammar/${exercise.slug}${exercise.preview ? `?preview=${exercise.lessonId}` : ""}`;
  return <div className={`${styles.page} ${styles.exercise}`}>
    <Link href={backHref} className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand"><ArrowLeft className="size-4" aria-hidden="true" />Quay lại chuyên đề</Link>
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm text-ink-muted">{exercise.topicTitle}</p><h1 className="mt-1 text-2xl font-extrabold">{exercise.title}</h1></div><span className={styles.pill}>{exercise.mode === "REVIEW" ? "Ôn lỗi đến hạn" : "Kiểm tra cuối bài"}</span></div>
    {exercise.preview && <p className={`${styles.note} mb-5`}>Bản xem trước dành cho admin. Có thể thử chấm, không lưu tiến độ.</p>}
    {result ? <section className={`${styles.panel} space-y-6`}><div className="flex items-center gap-3 text-brand"><CheckCircle2 aria-hidden="true" /><h2 ref={resultHeading} tabIndex={-1} className="text-xl font-bold">{result.correct}/{result.total} đúng · {result.passed ? "Đã đạt" : "Cùng luyện lại"}</h2></div><p className="text-sm text-ink-muted">{exercise.preview ? "Kết quả thử, không ghi vào tài khoản." : exercise.mode === "REVIEW" ? "Đã cập nhật lịch ôn. Kết quả này không thay điểm kiểm tra cuối bài." : "Đã lưu kết quả. Đạt từ 80% ở từng bài bắt buộc để hoàn thành chuyên đề."}</p><div className="flex flex-wrap gap-3">{exercise.mode === "TEST" ? <Button size="lg" onClick={() => { setResult(null); setIndex(0); setError(""); }}><RotateCcw className="size-4" aria-hidden="true" />Làm lại bài</Button> : <Link className="admin-action" href="/grammar/mistakes">Về Sổ lỗi sai →</Link>}<Link className="admin-action" href={backHref}>Về chuyên đề →</Link></div>{result.details.map((detail, i) => <details key={detail.id} className={styles.feedback} open={detail.correct !== detail.total}><summary className="cursor-pointer text-sm font-semibold">Câu {i + 1} · {detail.correct === detail.total ? "Đúng" : "Chưa khớp đáp án mẫu"} ({detail.correct}/{detail.total})</summary><div className="mt-3 space-y-2 text-sm leading-relaxed"><p>{exercise.questions.find(q => q.id === detail.id)?.prompt}</p><p><strong>Đáp án mẫu:</strong> {detail.expected}</p><p className="text-ink-muted">{detail.explanation}</p></div></details>)}</section> : <section className={styles.panel}>
      <div className="flex items-center justify-between text-sm"><span className="font-semibold text-brand">Câu {index + 1} / {exercise.questions.length}</span><span className="text-ink-muted">Mục tiêu: 80%</span></div><progress className="mt-3 h-1.5 w-full accent-[var(--brand)]" value={index + 1} max={exercise.questions.length} aria-label="Vị trí câu đang làm" />
      <div className={styles.question} key={question.id}><h2 className={styles.prompt}>{question.type === "PASSAGE_CLOZE" ? "Điền động từ vào từng ô trong đoạn dưới đây." : question.prompt}</h2><QuestionInput q={question} value={answers[question.id]} disabled={busy || Boolean(pending)} onChange={value => setAnswers(old => ({ ...old, [question.id]: value }))} /><p className="mt-5 text-xs text-ink-muted">Nguồn: {question.source}</p></div>
      {error && <div className={`${styles.note} mb-4`} role="alert"><p>{error}</p>{pending && <p className="mt-2 text-sm">Giữ nguyên câu trả lời đã gửi để thử lại an toàn. Bạn vẫn có thể xem các câu khác.</p>}</div>}
      <div className="flex items-center justify-between gap-3 border-t border-border pt-5"><Button size="lg" variant="outline" disabled={index === 0 || busy} onClick={() => setIndex(i => i - 1)}>Câu trước</Button>{index < exercise.questions.length - 1 && !pending ? <Button size="lg" onClick={() => setIndex(i => i + 1)}>Câu tiếp →</Button> : <Button size="lg" disabled={busy} onClick={submit}>{busy ? "Đang kiểm tra…" : pending ? "Thử gửi lại" : exercise.preview ? "Chấm thử" : "Nộp bài"}</Button>}</div>
      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Chuyển đến câu"><span className="sr-only">Danh sách câu hỏi</span>{exercise.questions.map((q, i) => <button key={q.id} type="button" className={styles.chip} aria-label={`Đến câu ${i + 1}`} aria-pressed={i === index} disabled={busy} onClick={() => setIndex(i)}>{i + 1}</button>)}</div>
    </section>}
  </div>;
}
