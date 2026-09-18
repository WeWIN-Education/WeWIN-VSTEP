"use client";

import { Check, LoaderCircle, Target } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const targets = [
  { value: "B1", label: "B1", description: "Củng cố nền tảng và giao tiếp cơ bản." },
  { value: "B2", label: "B2", description: "Mục tiêu độc lập trong học tập và công việc." },
  { value: "C1", label: "C1", description: "Mục tiêu sử dụng tiếng Anh linh hoạt, nâng cao." },
] as const;

export function VstepTargetForm({ initialTarget }: { initialTarget: "B1" | "B2" | "C1" }) {
  const router = useRouter();
  const [target, setTarget] = useState(initialTarget);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/profile/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vstepTarget: target }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Không thể lưu mục tiêu VSTEP.");
      setMessage("Đã lưu mục tiêu VSTEP.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể lưu mục tiêu VSTEP.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(event) => void save(event)} className="mt-6 border-t border-border pt-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><Target className="size-5" aria-hidden="true" /></span>
        <div>
          <h2 className="font-[family-name:var(--font-jakarta)] text-lg font-extrabold text-ink">Mục tiêu VSTEP</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">Chọn mức bạn đang hướng tới để thanh tiến độ và bài làm được tính đúng mục tiêu.</p>
        </div>
      </div>
      <fieldset className="mt-4 grid gap-2 sm:grid-cols-3">
        <legend className="sr-only">Chọn mục tiêu VSTEP</legend>
        {targets.map((item) => {
          const selected = target === item.value;
          return <label key={item.value} className={`relative flex min-h-[92px] cursor-pointer flex-col rounded-2xl border p-3 transition focus-within:ring-2 focus-within:ring-brand/40 ${selected ? "border-brand bg-brand-soft/70" : "border-border bg-white hover:border-brand/35"}`}><input type="radio" name="vstepTarget" value={item.value} checked={selected} onChange={() => setTarget(item.value)} className="sr-only" /><span className="flex items-center justify-between gap-2"><span className="text-base font-extrabold text-ink">{item.label}</span>{selected ? <Check className="size-4 text-brand" aria-hidden="true" /> : null}</span><span className="mt-1 text-xs leading-relaxed text-ink-muted">{item.description}</span></label>;
        })}
      </fieldset>
      {message ? <p role="status" className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p> : null}
      {error ? <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <button type="submit" disabled={pending} className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-btn)] bg-brand px-5 text-sm font-extrabold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60">{pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}{pending ? "Đang lưu…" : "Lưu mục tiêu"}</button>
    </form>
  );
}
