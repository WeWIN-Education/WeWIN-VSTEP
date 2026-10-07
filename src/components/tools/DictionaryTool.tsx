"use client";

import { ArrowLeftRight, BookOpen, Check, Copy, Loader2, Search, Volume2 } from "lucide-react";
import { FormEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type Direction = "auto" | "en-vi" | "vi-en";
type Result = {
  input: string;
  translation: string;
  sourceLanguage: "en" | "vi";
  targetLanguage: "en" | "vi";
  entry: {
    term: string;
    meaningVi: string;
    ipa: string | null;
    partOfSpeech: string | null;
    exampleEn: string | null;
    exampleVi: string | null;
    audioUrl: string | null;
  } | null;
};

export function DictionaryTool() {
  const [text, setText] = useState("");
  const [direction, setDirection] = useState<Direction>("auto");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text.trim()) {
      setError("Hãy nhập từ hoặc đoạn văn cần tra.");
      setResult(null);
      return;
    }
    setPending(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/tools/dictionary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, direction }),
      });
      const data = await response.json() as Result & { error?: string };
      if (!response.ok) throw new Error(data.error || "Không thể tra từ lúc này.");
      setResult(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tra từ lúc này.");
    } finally {
      setPending(false);
    }
  }

  async function copyTranslation() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.translation);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Trình duyệt không cho phép sao chép kết quả.");
    }
  }

  function playAudio() {
    const audioUrl = result?.entry?.audioUrl;
    if (audioUrl) void new Audio(audioUrl).play().catch(() => setError("Không thể phát âm thanh này."));
  }

  return (
    <Card padding="lg" className="mt-5">
      <form onSubmit={submit}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1">
            <span className="mb-1.5 block text-sm font-bold text-ink">Ngôn ngữ</span>
            <select value={direction} onChange={(event) => setDirection(event.target.value as Direction)} className="w-full rounded-xl border border-border bg-surface-card px-3 py-2.5 text-sm outline-none focus:border-brand">
              <option value="auto">Tự động nhận diện</option>
              <option value="en-vi">Tiếng Anh → Tiếng Việt</option>
              <option value="vi-en">Tiếng Việt → Tiếng Anh</option>
            </select>
          </label>
          <button type="button" onClick={() => setDirection(direction === "vi-en" ? "en-vi" : "vi-en")} aria-label="Đổi chiều ngôn ngữ" title="Đổi chiều ngôn ngữ" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-border px-3 text-ink-muted hover:border-brand hover:text-brand"><ArrowLeftRight className="size-4" aria-hidden="true" /></button>
          <Button type="submit" size="lg" disabled={pending} className="shrink-0">
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Search className="size-4" aria-hidden="true" />}
            {pending ? "Đang tra…" : "Tra từ"}
          </Button>
        </div>
        <label className="mt-4 block">
          <span className="sr-only">Từ hoặc đoạn văn cần tra</span>
          <textarea value={text} onChange={(event) => setText(event.target.value)} rows={5} maxLength={2000} placeholder="Nhập từ hoặc đoạn văn cần tra…" className="w-full resize-y rounded-2xl border border-border bg-surface-card px-4 py-3 text-base leading-relaxed outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10" />
          <span className="mt-1 block text-right text-xs text-ink-muted">{text.length}/2.000</span>
        </label>
      </form>

      {error ? <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p> : null}

      {result ? <div className="mt-5 grid gap-4 lg:grid-cols-2" aria-live="polite">
        <section className="rounded-2xl border border-border bg-surface-card p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-extrabold uppercase tracking-wide text-brand">Bản dịch</p>
            <div className="flex items-center gap-2">
              {result.entry?.audioUrl ? <button type="button" onClick={playAudio} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-bold text-ink hover:border-brand hover:text-brand"><Volume2 className="size-4" aria-hidden="true" /> Phát âm</button> : null}
              <button type="button" onClick={copyTranslation} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-bold text-ink hover:border-brand hover:text-brand">{copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}{copied ? "Đã sao chép" : "Sao chép"}</button>
            </div>
          </div>
          <p className="mt-3 whitespace-pre-wrap break-words text-lg font-semibold leading-relaxed text-ink">{result.translation}</p>
          <p className="mt-3 text-xs text-ink-muted"><ArrowLeftRight className="mr-1 inline size-3.5" aria-hidden="true" />{result.sourceLanguage.toUpperCase()} → {result.targetLanguage.toUpperCase()}</p>
        </section>

        {result.entry ? <section className="rounded-2xl border border-brand/20 bg-brand-soft/40 p-4">
          <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-card text-brand"><BookOpen className="size-5" aria-hidden="true" /></span><div className="min-w-0"><p className="text-xs font-extrabold uppercase tracking-wide text-brand">Thông tin từ</p><p className="mt-1 text-base font-extrabold text-ink">{result.entry.term}</p>{result.entry.ipa ? <p className="mt-0.5 text-sm text-ink-muted">/{result.entry.ipa}/</p> : null}</div></div>
          {result.entry.partOfSpeech ? <p className="mt-3 text-sm text-ink-muted">{result.entry.partOfSpeech}</p> : null}
          {result.entry.exampleEn ? <div className="mt-3 border-t border-brand/10 pt-3"><p className="text-sm leading-relaxed text-ink">{result.entry.exampleEn}</p>{result.entry.exampleVi ? <p className="mt-1 text-sm leading-relaxed text-ink-muted">{result.entry.exampleVi}</p> : null}</div> : null}
        </section> : null}
      </div> : null}
    </Card>
  );
}
