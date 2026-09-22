"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { useMemo, useRef, useState } from "react";

export type PracticePayload = {
  tokens?: readonly string[];
  sentence?: string;
  blankIndex?: number;
  options?: readonly string[];
  transcript?: string;
  turns?: readonly string[];
  passage?: string;
  blanks?: readonly { index: number; answer: string }[];
  audioUrl?: string;
  groupId?: string;
  groupQuestions?: readonly { id: string; prompt: string; options: readonly string[]; answer: string }[];
};

type PracticePlayerProps = {
  type: string;
  items: {
    id: string;
    type?: string;
    prompt: string;
    instruction: string | null;
    payload: PracticePayload;
    answer: unknown;
  }[];
};

type PracticeItem = PracticePlayerProps["items"][number];
type PracticeDisplayItem =
  | { kind: "single"; item: PracticeItem }
  | { kind: "listening"; item: PracticeItem; questions: NonNullable<PracticeItem["payload"]["groupQuestions"]> };

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function arraysEqual(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function groupItems(items: PracticeItem[]): PracticeDisplayItem[] {
  const groups: PracticeDisplayItem[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (item.type !== "LISTENING_FILL" || !item.payload.groupId) {
      groups.push({ kind: "single", item });
      continue;
    }
    if (seen.has(item.payload.groupId)) continue;
    seen.add(item.payload.groupId);
    groups.push({
      kind: "listening",
      item,
      questions: item.payload.groupQuestions?.length
        ? item.payload.groupQuestions
        : [{ id: item.id, prompt: item.prompt, options: item.payload.options ?? [], answer: String(item.answer) }],
    });
  }
  return groups;
}

export function PracticePlayer({ type, items }: PracticePlayerProps) {
  const displayItems = useMemo(() => groupItems(items), [items]);
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<"idle" | "correct" | "wrong">("idle");
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const scoreRef = useRef(0);
  const current = displayItems[index];
  const item = current?.item;
  const totalQuestions = displayItems.reduce((total, entry) => total + (entry.kind === "listening" ? entry.questions.length : 1), 0);
  const effectiveType = type === "MIXED" ? item?.type ?? "FILL_BLANK" : type;

  if (!displayItems.length) {
    return <Card padding="lg"><p className="text-sm text-ink-muted">Chưa có câu hỏi cho dạng bài này. Hãy thử một dạng luyện tập khác.</p></Card>;
  }

  if (completed) {
    return <Card padding="lg" className="text-center"><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-brand">HOÀN THÀNH PHIÊN ÔN</p><h2 className="mt-2 font-[family-name:var(--font-jakarta)] text-2xl font-extrabold text-ink">Kết quả của bạn</h2><p className="mt-4 text-4xl font-extrabold text-brand">{finalScore ?? score}<span className="text-xl text-ink-muted">/{totalQuestions}</span></p><p className="mt-3 text-sm leading-relaxed text-ink-muted">Kết quả chỉ hiển thị trong phiên này và không được lưu vào lịch sử làm bài.</p><Button type="button" className="mt-5" onClick={() => { scoreRef.current = 0; setIndex(0); setFeedback("idle"); setScore(0); setFinalScore(null); setCompleted(false); }}>Làm lại phiên này</Button></Card>;
  }

  const goNext = (scoreValue = scoreRef.current) => {
    setFeedback("idle");
    if (index === displayItems.length - 1) { setFinalScore(scoreValue); setCompleted(true); }
    else setIndex((value) => value + 1);
  };
  const finishCurrent = (points: number, possible: number, autoAdvance = true) => {
    if (feedback !== "idle") return;
    const nextScore = scoreRef.current + points;
    scoreRef.current = nextScore;
    setFeedback(points === possible ? "correct" : "wrong");
    setScore(nextScore);
    if (autoAdvance) window.setTimeout(() => goNext(nextScore), 700);
  };

  return <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-ink-muted"><span>{current?.kind === "listening" ? `Nhóm nghe ${index + 1}/${displayItems.length}` : `Câu ${index + 1}/${displayItems.length}`}</span><span>Điểm: <strong className="text-brand">{score}</strong></span></div><Card padding="lg">{item?.instruction ? <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-brand">{item.instruction}</p> : null}{item?.prompt ? <p className="text-[15px] font-semibold text-ink">{item.prompt}</p> : null}
    {current?.kind === "listening" ? <ListeningGroupExercise questions={current.questions} audioUrl={item.payload.audioUrl} onSubmit={(points) => finishCurrent(points, current.questions.length, false)} onContinue={() => goNext()} /> : null}
    {current?.kind !== "listening" && (effectiveType === "WORD_ORDER" || effectiveType === "LISTENING_ORDER") ? <OrderExercise key={item?.id} tokens={effectiveType === "LISTENING_ORDER" ? (item?.payload.turns ?? []) : (item?.payload.tokens ?? [])} answer={item?.answer as string[]} onSubmit={(ok) => finishCurrent(ok ? 1 : 0, 1)} /> : null}
    {current?.kind !== "listening" && (effectiveType === "FILL_BLANK" || effectiveType === "LISTENING_FILL") ? <ChoiceExercise key={item?.id} options={item?.payload.options ?? []} answer={String(item?.answer)} sentence={item?.payload.sentence} transcript={item?.payload.transcript} audioUrl={item?.payload.audioUrl} onSubmit={(ok) => finishCurrent(ok ? 1 : 0, 1)} /> : null}
    {current?.kind !== "listening" && effectiveType === "CLOZE_READING" ? <ClozeExercise key={item?.id} passage={item?.payload.passage ?? ""} options={item?.payload.options ?? []} answer={String(item?.answer)} onSubmit={(ok) => finishCurrent(ok ? 1 : 0, 1)} /> : null}
    {feedback === "correct" ? <p className="mt-4 text-sm font-semibold text-accent-green">Chính xác!</p> : null}</Card></div>;
}

function ListeningGroupExercise({ questions, audioUrl, onSubmit, onContinue }: { questions: readonly { id: string; prompt: string; options: readonly string[]; answer: string }[]; audioUrl?: string; onSubmit: (points: number) => void; onContinue: () => void }) {
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const submit = () => { if (submitted) return; const points = questions.reduce((total, question) => total + (selected[question.id] === question.answer ? 1 : 0), 0); setSubmitted(true); onSubmit(points); };
  return <div className="mt-4 space-y-4">{audioUrl ? <audio className="w-full" controls preload="metadata" src={audioUrl} aria-label="Audio nhóm Listening" /> : null}<p className="text-sm text-ink-muted">Nghe một đoạn và hoàn thành toàn bộ câu hỏi bên dưới trước khi nộp nhóm.</p><div className="space-y-3">{questions.map((question, questionIndex) => <article key={question.id} className="rounded-xl border-2 border-ink/20 bg-white p-4"><p className="text-sm font-extrabold text-ink">Câu {questionIndex + 1}. {question.prompt}</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{question.options.map((option) => <button key={option} type="button" disabled={submitted} onClick={() => setSelected((current) => ({ ...current, [question.id]: option }))} className={cn("min-h-11 rounded-lg border px-3 py-2 text-left text-sm font-semibold", selected[question.id] === option ? "border-brand bg-brand-soft text-brand" : "border-border bg-white text-ink hover:border-brand")}>{option}</button>)}</div>{submitted ? <p className={cn("mt-3 text-sm font-bold", selected[question.id] === question.answer ? "text-accent-green" : "text-red-600")}>{selected[question.id] === question.answer ? "Đúng" : `Đáp án: ${question.answer}`}</p> : null}</article>)}</div>{!submitted ? <Button type="button" onClick={submit}>Nộp nhóm Listening</Button> : <Button type="button" onClick={onContinue}>Tiếp tục</Button>}</div>;
}

function OrderExercise({ tokens, answer, onSubmit }: { tokens: readonly string[]; answer: readonly string[]; onSubmit: (ok: boolean) => void }) {
  const poolInit = useMemo(() => shuffle([...tokens]), [tokens]);
  const [pool, setPool] = useState(poolInit);
  const [picked, setPicked] = useState<string[]>([]);
  const pick = (token: string, fromPool: boolean, idx: number) => { if (fromPool) { setPool((p) => p.filter((_, i) => i !== idx)); setPicked((p) => [...p, token]); } else { setPicked((p) => p.filter((_, i) => i !== idx)); setPool((p) => [...p, token]); } };
  return <div className="mt-4 space-y-4"><div className="flex min-h-[52px] flex-wrap gap-2 rounded-xl border border-dashed border-border bg-surface p-3">{picked.length === 0 ? <span className="text-[12px] text-ink-faint">Chọn từ bên dưới để xếp câu…</span> : picked.map((token, i) => <button key={`p-${token}-${i}`} type="button" onClick={() => pick(token, false, i)} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white">{token}</button>)}</div><div className="flex flex-wrap gap-2">{pool.map((token, i) => <button key={`o-${token}-${i}`} type="button" onClick={() => pick(token, true, i)} className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-semibold text-ink hover:border-brand">{token}</button>)}</div><div className="flex gap-2"><Button type="button" onClick={() => onSubmit(arraysEqual(picked, answer))} disabled={picked.length === 0}>Kiểm tra</Button><Button type="button" variant="outline" onClick={() => { setPool(shuffle([...tokens])); setPicked([]); }}>Xáo lại</Button></div></div>;
}

function ChoiceExercise({ options, answer, sentence, transcript, audioUrl, onSubmit }: { options: readonly string[]; answer: string; sentence?: string; transcript?: string; audioUrl?: string; onSubmit: (ok: boolean) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  return <div className="mt-4 space-y-3">{audioUrl ? <audio className="w-full rounded-xl" controls preload="metadata" src={audioUrl} /> : transcript ? <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-ink-muted">Audio: <em>{transcript}</em></div> : null}{sentence ? <p className="rounded-xl bg-brand-soft px-4 py-3 font-mono text-[15px] text-ink">{sentence}</p> : null}<div className="grid gap-2 sm:grid-cols-2">{options.map((option) => <button key={option} type="button" onClick={() => setSelected(option)} className={cn("rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors", selected === option ? "border-brand bg-brand-soft text-brand" : "border-border bg-white text-ink hover:border-brand")}>{option}</button>)}</div><Button type="button" disabled={!selected} onClick={() => onSubmit(selected === answer)}>Kiểm tra</Button></div>;
}

function ClozeExercise({ passage, options, answer, onSubmit }: { passage: string; options: readonly string[]; answer: string; onSubmit: (ok: boolean) => void }) {
  const parts = passage.split(/_{3,}/);
  return <div className="mt-4 space-y-3"><p className="rounded-xl border border-border bg-white px-4 py-3 text-[14px] leading-relaxed text-ink">{parts.map((part, i, arr) => <span key={i}>{part}{i < arr.length - 1 ? <span className="mx-1 inline-block min-w-[64px] border-b-2 border-brand font-bold text-brand">____</span> : null}</span>)}</p><ChoiceExercise options={options} answer={answer} onSubmit={onSubmit} /></div>;
}
