"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

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

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function arraysEqual(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

export function PracticePlayer({ type, items }: PracticePlayerProps) {
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<"idle" | "correct" | "wrong">("idle");
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const item = items[index];
  const effectiveType = type === "MIXED" ? item?.type ?? "FILL_BLANK" : type;

  if (!items.length) {
    return (
      <Card padding="lg">
        <p className="text-sm text-ink-muted">
          Chưa có câu hỏi cho dạng bài này. Hãy thử một dạng luyện tập khác.
        </p>
      </Card>
    );
  }

  if (completed) {
    return (
      <Card padding="lg" className="text-center">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-brand">HOÀN THÀNH PHIÊN ÔN</p>
        <h2 className="mt-2 font-[family-name:var(--font-jakarta)] text-2xl font-extrabold text-ink">Kết quả của bạn</h2>
        <p className="mt-4 text-4xl font-extrabold text-brand">{finalScore ?? score}<span className="text-xl text-ink-muted">/{items.length}</span></p>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">Kết quả chỉ hiển thị trong phiên này và không được lưu vào lịch sử làm bài.</p>
        <Button type="button" className="mt-5" onClick={() => { setIndex(0); setFeedback("idle"); setScore(0); setFinalScore(null); setCompleted(false); }}>Làm lại phiên này</Button>
      </Card>
    );
  }

  const next = (ok: boolean) => {
    if (feedback !== "idle") return;
    const nextScore = score + (ok ? 1 : 0);
    setFeedback(ok ? "correct" : "wrong");
    setScore(nextScore);
    window.setTimeout(() => {
      setFeedback("idle");
      if (index === items.length - 1) {
        setFinalScore(nextScore);
        setCompleted(true);
      } else {
        setIndex((i) => i + 1);
      }
    }, 700);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-ink-muted">
        <span>
          Câu {index + 1}/{items.length}
        </span>
        <span>
          Điểm: <strong className="text-brand">{score}</strong>
        </span>
      </div>

      <Card padding="lg">
        {item.instruction ? (
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-brand">
            {item.instruction}
          </p>
        ) : null}
        <p className="text-[15px] font-semibold text-ink">{item.prompt}</p>

        {effectiveType === "WORD_ORDER" || effectiveType === "LISTENING_ORDER" ? (
          <OrderExercise
            key={item.id}
            tokens={
              effectiveType === "LISTENING_ORDER"
                ? (item.payload.turns ?? [])
                : (item.payload.tokens ?? [])
            }
            answer={item.answer as string[]}
            onSubmit={next}
          />
        ) : null}

        {effectiveType === "FILL_BLANK" || effectiveType === "LISTENING_FILL" ? (
          <ChoiceExercise
            key={item.id}
            options={item.payload.options ?? []}
            answer={String(item.answer)}
            sentence={item.payload.sentence}
            transcript={item.payload.transcript}
            audioUrl={item.payload.audioUrl}
            onSubmit={next}
          />
        ) : null}

        {effectiveType === "CLOZE_READING" ? (
          <ClozeExercise
            key={item.id}
            passage={item.payload.passage ?? ""}
            options={item.payload.options ?? []}
            answer={String(item.answer)}
            onSubmit={next}
          />
        ) : null}

        {feedback !== "idle" ? (
          <p
            className={cn(
              "mt-4 text-sm font-semibold",
              feedback === "correct" ? "text-accent-green" : "text-red-500",
            )}
          >
            {feedback === "correct" ? "Chính xác!" : "Chưa đúng — thử câu tiếp theo."}
          </p>
        ) : null}
      </Card>
    </div>
  );
}

function OrderExercise({
  tokens,
  answer,
  onSubmit,
}: {
  tokens: readonly string[];
  answer: readonly string[];
  onSubmit: (ok: boolean) => void;
}) {
  const poolInit = useMemo(() => shuffle([...tokens]), [tokens]);
  const [pool, setPool] = useState(poolInit);
  const [picked, setPicked] = useState<string[]>([]);

  const pick = (token: string, fromPool: boolean, idx: number) => {
    if (fromPool) {
      setPool((p) => p.filter((_, i) => i !== idx));
      setPicked((p) => [...p, token]);
    } else {
      setPicked((p) => p.filter((_, i) => i !== idx));
      setPool((p) => [...p, token]);
    }
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="flex min-h-[52px] flex-wrap gap-2 rounded-xl border border-dashed border-border bg-surface p-3">
        {picked.length === 0 ? (
          <span className="text-[12px] text-ink-faint">Chọn từ bên dưới để xếp câu…</span>
        ) : (
          picked.map((t, i) => (
            <button
              key={`p-${t}-${i}`}
              type="button"
              onClick={() => pick(t, false, i)}
              className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white"
            >
              {t}
            </button>
          ))
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {pool.map((t, i) => (
          <button
            key={`o-${t}-${i}`}
            type="button"
            onClick={() => pick(t, true, i)}
            className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-semibold text-ink hover:border-brand"
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          onClick={() => onSubmit(arraysEqual(picked, answer))}
          disabled={picked.length === 0}
        >
          Kiểm tra
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setPool(shuffle([...tokens]));
            setPicked([]);
          }}
        >
          Xáo lại
        </Button>
      </div>
    </div>
  );
}

function ChoiceExercise({
  options,
  answer,
  sentence,
  transcript,
  audioUrl,
  onSubmit,
}: {
  options: readonly string[];
  answer: string;
  sentence?: string;
  transcript?: string;
  audioUrl?: string;
  onSubmit: (ok: boolean) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="mt-4 space-y-3">
      {audioUrl ? <audio className="w-full rounded-xl" controls preload="metadata" src={audioUrl} /> : transcript ? (
        <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-ink-muted">
          <span className="mr-2 inline-flex size-7 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">
            ▶
          </span>
          Audio: <em>{transcript}</em>
        </div>
      ) : null}
      {sentence ? (
        <p className="rounded-xl bg-brand-soft px-4 py-3 font-mono text-[15px] text-ink">
          {sentence}
        </p>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setSelected(opt)}
            className={cn(
              "rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors",
              selected === opt
                ? "border-brand bg-brand-soft text-brand"
                : "border-border bg-white text-ink hover:border-brand",
            )}
          >
            {opt}
          </button>
        ))}
      </div>
      <Button type="button" disabled={!selected} onClick={() => onSubmit(selected === answer)}>
        Kiểm tra
      </Button>
    </div>
  );
}

function ClozeExercise({
  passage,
  options,
  answer,
  onSubmit,
}: {
  passage: string;
  options: readonly string[];
  answer: string;
  onSubmit: (ok: boolean) => void;
}) {
  const parts = passage.split(/_{3,}/);

  return (
    <div className="mt-4 space-y-3">
      <p className="rounded-xl border border-border bg-white px-4 py-3 text-[14px] leading-relaxed text-ink">
        {parts.map((part, i, arr) => (
          <span key={i}>
            {part}
            {i < arr.length - 1 ? (
              <span className="mx-1 inline-block min-w-[64px] border-b-2 border-brand font-bold text-brand">
                ____
              </span>
            ) : null}
          </span>
        ))}
      </p>
      <ChoiceExercise options={options} answer={answer} onSubmit={onSubmit} />
    </div>
  );
}
