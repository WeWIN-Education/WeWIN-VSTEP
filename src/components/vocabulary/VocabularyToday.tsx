"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Check, ChevronLeft, RotateCcw, Volume2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Mascot } from "@/components/ui/Mascot";
import { STUDY_GOALS } from "@/lib/vocabulary-study-rules";
import type { FlashcardEntry } from "./VocabularyFlashcards";
import styles from "./flashcard-study.module.css";

type Session = { version: string; isReview: boolean; entries: (FlashcardEntry & { topic?: { name: string } | null })[] };
type Dashboard = { goal: number; due: number; learnedToday: number; active: Session | null };
type Question = { id: string; term: string; options: string[] };
type Result = { correct: number; total: number; passed: boolean; details: { id: string; correct: boolean; meaning: string }[] };
const primary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-50";
const secondary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-surface-card px-4 py-3 text-sm font-semibold text-ink transition-colors hover:bg-brand-soft disabled:opacity-50";

export function VocabularyToday({ initial }: { initial: Dashboard }) {
  const [dashboard, setDashboard] = useState(initial);
  const [goal, setGoal] = useState(initial.goal);
  const [session, setSession] = useState(initial.active);
  const [order, setOrder] = useState(initial.active?.entries.map(entry => entry.id) ?? []);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [phase, setPhase] = useState<"learn" | "quiz" | "result">("learn");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const requestPending = useRef(false);
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const current = session?.entries.find(entry => entry.id === order[index]);
  const question = questions[index];
  const audio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => { audio.current?.pause(); window.speechSynthesis?.cancel(); }, []);
  useEffect(() => { if (phase !== "learn") heading.current?.focus(); }, [index, phase]);

  async function request<T>(body: object): Promise<T | null> {
    if (requestPending.current) return null;
    requestPending.current = true;
    setBusy(true); setError("");
    const abort = new AbortController();
    const timer = window.setTimeout(() => abort.abort(), 20000);
    try {
      const response = await fetch("/api/vocabulary/study", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: abort.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không hoàn tất được yêu cầu.");
      return data;
    } catch (error) { setError(error instanceof Error && error.name !== "AbortError" ? error.message : "Kết nối chậm. Nội dung vẫn được giữ; hãy thử lại."); return null; }
    finally { clearTimeout(timer); requestPending.current = false; setBusy(false); }
  }

  async function start() {
    const data = await request<Session>({ action: "start", goal });
    if (data) { setSession(data); setOrder(data.entries.map(entry => entry.id)); setIndex(0); setFlipped(false); setPhase("learn"); setResult(null); }
  }

  async function quiz() {
    if (!session) return;
    const data = await request<{ questions: Question[] }>({ action: "quiz", version: session.version });
    if (data) { setQuestions(data.questions); setAnswers({}); setIndex(0); setPhase("quiz"); }
  }

  async function submit() {
    if (!session) return;
    const data = await request<Result>({ action: "submit", version: session.version, answers });
    if (data) {
      setResult(data); setPhase("result");
      if (data.passed) {
        setDashboard(old => ({ ...old, learnedToday: old.learnedToday + (session.isReview ? 0 : data.total), due: Math.max(0, old.due - (session.isReview ? data.total : 0)) }));
        // Refresh counts without blocking the saved completion result.
        void fetch("/api/vocabulary/study", { cache: "no-store" }).then(response => response.ok ? response.json() : null).then(data => { if (data) setDashboard(data); }).catch(() => {});
      }
    }
  }

  function next(remembered: boolean) {
    if (!current) return;
    if (!remembered) setOrder(old => [...old, current.id]);
    setIndex(old => old + 1); setFlipped(false);
  }

  function pronounce() {
    if (!current) return;
    audio.current?.pause(); window.speechSynthesis?.cancel();
    if (current.audioUrl) { audio.current = new Audio(current.audioUrl); void audio.current.play().catch(() => setError("Chưa phát được âm thanh. Hãy thử lại.")); }
    else if ("speechSynthesis" in window) { const utterance = new SpeechSynthesisUtterance(current.term); utterance.lang = "en-US"; window.speechSynthesis.speak(utterance); }
  }

  const active = session && !(phase === "result" && result?.passed);
  return <div className="mx-auto w-full max-w-[1040px] space-y-6 text-ink">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold tracking-[.15em] text-brand">TỪ VỰNG · HỌC HÔM NAY</p><h1 className="mt-2 text-2xl font-extrabold md:text-3xl">Một bài nhỏ. Thêm một bước tiến.</h1><p className="mt-2 text-sm leading-relaxed text-ink-muted">Ôn từ đến hạn trước, học từ mới sau. Đạt 80% để mở bài tiếp ngay.</p></div><Link href="/vocabulary/topics" className={secondary}><BookOpen size={17} aria-hidden="true" />Kho từ vựng</Link></header>
    <div className="grid grid-cols-2 gap-3"><Card><p className="text-sm text-ink-muted">Từ mới đã học hôm nay</p><p className="mt-2 text-2xl font-extrabold text-brand">{dashboard.learnedToday}<span className="text-sm text-ink-muted"> / {goal}</span></p><div className="mt-3 h-2 overflow-hidden rounded-full bg-brand-soft" role="progressbar" aria-label="Mục tiêu từ mới hôm nay" aria-valuenow={Math.min(dashboard.learnedToday, goal)} aria-valuemax={goal}><div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, dashboard.learnedToday / goal * 100)}%` }} /></div></Card><Card><p className="text-sm text-ink-muted">Từ đến hạn ôn</p><p className="mt-2 text-2xl font-extrabold text-brand">{dashboard.due}</p><p className="mt-2 text-xs leading-relaxed text-ink-muted">Chia từng lượt tối đa 20 từ, không cần ôn hết một lần.</p></Card></div>
    {error && <div role="alert" className="rounded-2xl border border-border bg-surface-card p-4 text-sm text-ink"><p>{error}</p><p className="mt-1 text-ink-muted">Bài học và câu trả lời đang nhập vẫn được giữ.</p></div>}
    {!active && phase !== "result" && <Card padding="lg" className="flex flex-col items-start gap-6 sm:flex-row sm:items-center"><Mascot state="friendly" size={120} /><div className="flex-1"><h2 className="text-lg font-bold">Sẵn sàng cho một lượt học?</h2><label className="mt-4 block text-sm font-semibold" htmlFor="daily-goal">Mục tiêu từ mới mỗi ngày</label><select id="daily-goal" className="mt-2 min-h-11 w-full rounded-xl border border-border bg-surface-card px-3 sm:w-56" value={goal} onChange={event => setGoal(Number(event.target.value))}>{STUDY_GOALS.map(value => <option key={value} value={value}>{value} từ mới</option>)}</select><p className="mt-3 text-sm text-ink-muted">Mục tiêu giúp bạn giữ nhịp học; vẫn có thể học thêm khi đã hoàn thành.</p><button type="button" disabled={busy} onClick={() => void start()} className={`${primary} mt-5`}>{busy ? "Đang chuẩn bị…" : dashboard.due ? "Ôn từ đến hạn" : "Bắt đầu học"}<ArrowRight size={17} aria-hidden="true" /></button></div></Card>}
    {active && phase === "learn" && <section className="space-y-4"><div className="flex flex-wrap justify-between gap-2 text-sm"><span className="font-semibold text-brand">{session.isReview ? "Ôn tập" : "Từ mới"} · {current?.topic?.name || "Luyện từ vựng"}</span><span className="text-ink-muted">{Math.min(index + 1, order.length)}/{order.length} lượt thẻ</span></div>{current ? <><button type="button" onClick={() => setFlipped(value => !value)} aria-label={flipped ? "Lật về từ tiếng Anh" : `Xem nghĩa của ${current.term}`} className={`${styles.card} ${flipped ? styles.cardFlipped : ""}`}><span className={styles.cardInner}><span aria-hidden={flipped} className={`${styles.face} ${styles.front}`}><span className={styles.faceContent}><span className="text-xs font-bold tracking-wider text-brand">TỪ / CỤM TỪ</span><span className="mt-6 break-words text-4xl font-extrabold text-brand sm:text-6xl">{current.term}</span></span><span className={styles.faceFooter}>Chạm để xem nghĩa và cách dùng</span></span><span aria-hidden={!flipped} className={`${styles.face} ${styles.back}`}><span className={styles.faceContent}><span className="text-sm text-brand">{current.ipa}</span><span className="mt-4 text-2xl font-bold sm:text-3xl">{current.meaningVi}</span><span className="mt-3 text-sm text-ink-muted">{current.partOfSpeech}</span><span className="mt-5 text-base italic">{current.exampleEn}</span><span className="mt-2 text-sm text-ink-muted">{current.exampleVi}</span></span><span className={styles.faceFooter}>Nhớ lại từ trước khi chuyển thẻ</span></span></span></button><div className="flex flex-wrap gap-3"><button type="button" className={secondary} onClick={pronounce}><Volume2 size={17} aria-hidden="true" />Nghe phát âm</button><button type="button" className={`${secondary} flex-1`} disabled={!flipped} onClick={() => next(false)}><RotateCcw size={17} aria-hidden="true" />Ôn lại cuối lượt</button><button type="button" className={`${primary} flex-1`} disabled={!flipped} onClick={() => next(true)}><Check size={17} aria-hidden="true" />Đã nhớ</button></div></> : <Card padding="lg" className="text-center"><Check className="mx-auto text-brand" size={32} aria-hidden="true" /><h2 className="mt-4 text-xl font-bold">Đã xem hết các thẻ</h2><p className="mt-2 text-sm text-ink-muted">Kiểm tra nhanh để hoàn thành bài và lên lịch ôn.</p><button type="button" disabled={busy} className={`${primary} mt-5`} onClick={() => void quiz()}>{busy ? "Đang chuẩn bị…" : "Bắt đầu kiểm tra"}</button></Card>}</section>}
    {active && phase === "quiz" && question && <Card padding="lg"><p className="text-sm font-semibold text-brand">Kiểm tra · Câu {index + 1}/{questions.length}</p><h2 ref={heading} tabIndex={-1} className="mt-4 break-words text-3xl font-extrabold outline-none">{question.term}</h2><p className="mt-2 text-sm text-ink-muted">Chọn nghĩa phù hợp.</p><fieldset className="mt-6 grid gap-3"><legend className="sr-only">Nghĩa của {question.term}</legend>{question.options.map((option, i) => <label key={option} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border p-4 text-sm ${answers[question.id] === option ? "border-brand bg-brand-soft text-brand" : "border-border bg-surface text-ink"}`}><input type="radio" name={question.id} value={option} checked={answers[question.id] === option} disabled={busy} onChange={() => setAnswers(old => ({ ...old, [question.id]: option }))} /><span className="font-bold">{String.fromCharCode(65 + i)}.</span>{option}</label>)}</fieldset><div className="mt-6 flex flex-wrap justify-between gap-3"><button type="button" className={secondary} disabled={!index || busy} onClick={() => setIndex(old => old - 1)}><ChevronLeft size={17} aria-hidden="true" />Câu trước</button><button type="button" className={primary} disabled={!answers[question.id] || busy} onClick={() => index + 1 < questions.length ? setIndex(old => old + 1) : void submit()}>{busy ? "Đang lưu…" : index + 1 < questions.length ? "Câu tiếp theo" : "Nộp kiểm tra"}</button></div></Card>}
    {phase === "result" && result && <Card padding="lg"><p className="text-sm font-bold text-brand">KẾT QUẢ BÀI HỌC</p><h2 ref={heading} tabIndex={-1} className="mt-3 text-2xl font-extrabold outline-none">{result.correct}/{result.total} câu đúng · {result.passed ? "Đã hoàn thành" : "Cùng ôn lại một chút"}</h2><p className="mt-3 text-sm leading-relaxed text-ink-muted">{result.passed ? "Đã lưu tiến độ và lịch ôn. Bạn có thể học lượt tiếp ngay; từ chưa nhớ sẽ quay lại sớm hơn." : "Cần đạt ít nhất 80%. Ôn lại các từ sai rồi làm lại, không cần chờ sang ngày mới."}</p>{result.details.some(row => !row.correct) && <ul className="mt-5 space-y-2">{result.details.filter(row => !row.correct).map(row => <li key={row.id} className="rounded-xl bg-surface p-3 text-sm"><strong>{session?.entries.find(entry => entry.id === row.id)?.term}</strong> · {row.meaning}</li>)}</ul>}<div className="mt-6 flex flex-wrap gap-3">{result.passed ? <><button type="button" className={primary} disabled={busy} onClick={() => void start()}>{busy ? "Đang chuẩn bị…" : "Học lượt tiếp"}<ArrowRight size={17} aria-hidden="true" /></button><button type="button" className={secondary} onClick={() => { setSession(null); setPhase("learn"); }}>Xong hôm nay</button></> : <button type="button" className={primary} onClick={() => { setOrder(result.details.filter(row => !row.correct).map(row => row.id)); setIndex(0); setFlipped(false); setPhase("learn"); }}>Ôn lại từ sai</button>}</div></Card>}
    <p className="text-xs leading-relaxed text-ink-muted">Kho từ theo chủ đề luôn mở để tra cứu. Lịch ôn dựa trên kết quả kiểm tra, không dùng AI.</p>
  </div>;
}
