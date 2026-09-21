"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen, Check, Flame, Gift, RefreshCw, Zap } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { DailyChallengeSummary } from "@/lib/daily-challenge-rules";

export function DailyChallenges() {
  const [state, setState] = useState<DailyChallengeSummary | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const clock = useRef({ receivedAt: 0, seconds: 0 });
  const pending = useRef(false);
  const active = useRef(true);
  const controller = useRef<AbortController | null>(null);
  const router = useRouter();
  const refresh = useCallback(async (claim = false, day?: string) => {
    if (pending.current) return;
    pending.current = true; setBusy(true);
    controller.current = new AbortController();
    try {
      const response = await fetch("/api/daily-challenges", {
        method: claim ? "POST" : "GET", cache: "no-store", signal: controller.current.signal,
        ...(claim ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ day }) } : {}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không tải được nhiệm vụ.");
      if (!active.current) return;
      const seconds = Math.max(0, Math.floor((Date.parse(data.resetsAt) - Date.parse(data.serverNow)) / 1000));
      clock.current = { receivedAt: Date.now(), seconds };
      setRemaining(seconds); setState(data); setError("");
      if (claim) router.refresh();
    } catch (e) {
      if (active.current && !controller.current?.signal.aborted) setError(e instanceof Error ? e.message : "Không tải được nhiệm vụ.");
    } finally { pending.current = false; if (active.current) setBusy(false); }
  }, [router]);
  useEffect(() => {
    active.current = true;
    void refresh();
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    const polling = setInterval(visible, 30000);
    const timer = setInterval(() => {
      if (!clock.current.receivedAt) return;
      const value = Math.max(0, clock.current.seconds - Math.floor((Date.now() - clock.current.receivedAt) / 1000));
      setRemaining(value);
      if (value === 0 && document.visibilityState === "visible" && Date.now() - clock.current.receivedAt > 5000) {
        clock.current.receivedAt = 0;
        void refresh();
      }
    }, 1000);
    window.addEventListener("focus", visible); document.addEventListener("visibilitychange", visible);
    return () => { active.current = false; controller.current?.abort(); clearInterval(polling); clearInterval(timer); window.removeEventListener("focus", visible); document.removeEventListener("visibilitychange", visible); };
  }, [refresh]);
  const complete = state?.tasks.every(task => task.value >= task.goal);
  const time = [Math.floor(remaining / 3600), Math.floor(remaining / 60) % 60, remaining % 60].map(n => String(n).padStart(2, "0")).join(":");
  const icons = [BookOpen, Zap, Flame];
  return <Card padding="lg" className="relative overflow-hidden">
    <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 size-40 rounded-full bg-amber-50" />
    <div className="relative flex flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-lg font-bold text-ink"><Gift className="size-5 text-brand" aria-hidden="true" />Nhiệm vụ hôm nay</h2>
      {state && <span title="Đặt lại lúc 00:00 theo giờ Việt Nam" className="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold tabular-nums text-brand">Còn {time}</span>}
    </div>
    {!state && !error && <p role="status" className="py-6 text-sm text-ink-muted">Đang tải nhiệm vụ…</p>}
    {state && <>
      <div className="relative mt-5 space-y-3">{state.tasks.map((task, i) => {
        const Icon = icons[i]; const done = task.value >= task.goal;
        return <Link href={task.href} key={task.id} className="group flex min-h-16 items-center gap-3 rounded-2xl border border-transparent p-2 transition-colors hover:border-brand-soft hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand">
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${done ? "bg-emerald-50 text-emerald-700" : "bg-brand-soft text-brand"}`}>{done ? <Check className="size-5" aria-hidden="true" /> : <Icon className="size-5" aria-hidden="true" />}</span>
          <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-3 text-sm"><span className="font-semibold text-ink">{task.title}</span><span className="text-xs font-bold tabular-nums text-brand">{task.value}/{task.goal}</span></span><span role="progressbar" aria-label={task.title} aria-valuemin={0} aria-valuemax={task.goal} aria-valuenow={task.value} className="mt-2 block h-2 overflow-hidden rounded-full bg-surface"><span className={`block h-full origin-left rounded-full ${done ? "bg-emerald-600" : "bg-brand"}`} style={{ transform: `scaleX(${task.value / task.goal})` }} /></span></span>
        </Link>;
      })}</div>
      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-ink">{state.claimed ? `Đã nhận ${state.reward} XP hôm nay` : `Hoàn thành cả ba để nhận ${state.reward} XP`}</p>
        {!state.claimed && <button type="button" disabled={!complete || busy || remaining === 0 || Boolean(error)} onClick={() => void refresh(true, state.day)} className="mt-3 min-h-11 w-full rounded-xl bg-brand px-4 text-sm font-bold text-white transition-colors hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:bg-brand-soft disabled:text-brand">{busy ? "Đang cập nhật…" : complete ? "Nhận thưởng" : "Tiếp tục học để mở thưởng"}</button>}
      </div>
      <details className="mt-3 text-xs leading-5 text-ink-muted"><summary className="cursor-pointer py-2">Cách tính nhiệm vụ</summary>Ôn 30 từ khác nhau trong kho từ vựng chung bằng cách đánh dấu mức nhớ. XP nhiệm vụ chỉ tính từ bài VSTEP đã nộp trong ngày, không gồm XP thưởng. Đặt lại lúc 00:00 giờ Việt Nam; phần thưởng cần nhận trước giờ này.</details>
    </>}
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    <button type="button" disabled={busy} onClick={() => void refresh()} className="mt-2 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-brand disabled:opacity-50"><RefreshCw className="size-3.5" aria-hidden="true" />Cập nhật tiến độ</button>
  </Card>;
}
