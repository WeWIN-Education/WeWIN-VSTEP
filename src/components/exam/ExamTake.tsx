"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useMemo, useState } from "react";

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
};

type ExamTakeProps = {
  title: string;
  level: number;
  slug: string;
  durationMin: number;
  questions: QuizQuestion[];
};

export function ExamTake({ title, level, slug, durationMin, questions }: ExamTakeProps) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const score = useMemo(() => {
    if (!submitted) return 0;
    return questions.reduce((sum, q) => {
      return sum + (answers[q.id] === q.correctIndex ? 1 : 0);
    }, 0);
  }, [answers, questions, submitted]);

  if (!questions.length) {
    return (
      <Card padding="lg">
        <p className="text-sm text-ink-muted">Đề thi chưa có câu hỏi demo.</p>
        <Link href={`/exam/lop-${level}`} className="mt-3 inline-block text-sm font-semibold text-brand">
          ← Quay lại danh sách đề
        </Link>
      </Card>
    );
  }

  if (submitted) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <Card padding="lg" className="mx-auto max-w-lg text-center">
        <p className="text-[12px] font-bold uppercase tracking-wide text-brand">Kết quả</p>
        <h1 className="mt-2 font-[family-name:var(--font-jakarta)] text-2xl font-extrabold text-ink">
          {score}/{questions.length} đúng ({pct}%)
        </h1>
        <p className="mt-2 text-sm text-ink-muted">{title}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button
            type="button"
            onClick={() => {
              setAnswers({});
              setIndex(0);
              setSubmitted(false);
            }}
          >
            Làm lại
          </Button>
          <Link href={`/exam/lop-${level}`}>
            <Button type="button" variant="outline">
              Đề khác
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  const q = questions[index];
  const selected = answers[q.id];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-ink-muted">
        <span>
          {title} · {durationMin} phút
        </span>
        <span>
          Câu {index + 1}/{questions.length}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-brand-soft">
        <div
          className="h-full bg-brand transition-all"
          style={{ width: `${((index + 1) / questions.length) * 100}%` }}
        />
      </div>

      <Card padding="lg">
        <p className="text-[15px] font-semibold leading-relaxed text-ink">{q.prompt}</p>
        <div className="mt-4 grid gap-2">
          {q.options.map((opt, i) => (
            <button
              key={opt}
              type="button"
              onClick={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
              className={cn(
                "rounded-xl border px-4 py-3 text-left text-sm font-semibold",
                selected === i
                  ? "border-brand bg-brand-soft text-brand"
                  : "border-border bg-white hover:border-brand",
              )}
            >
              <span className="mr-2 text-ink-faint">{String.fromCharCode(65 + i)}.</span>
              {opt}
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={index === 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
          >
            Trước
          </Button>
          {index < questions.length - 1 ? (
            <Button
              type="button"
              disabled={selected === undefined}
              onClick={() => setIndex((i) => i + 1)}
            >
              Tiếp
            </Button>
          ) : (
            <Button
              type="button"
              disabled={Object.keys(answers).length < questions.length}
              onClick={() => setSubmitted(true)}
            >
              Nộp bài
            </Button>
          )}
        </div>
      </Card>

      <p className="text-center text-[12px] text-ink-faint">
        Đề demo ·{" "}
        <Link href={`/exam/lop-${level}`} className="text-brand hover:underline">
          /exam/lop-{level}/{slug}
        </Link>
      </p>
    </div>
  );
}
