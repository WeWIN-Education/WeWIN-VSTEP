"use client";
import { notifyLearningActivity } from "@/lib/learning-activity-events";

import { Card } from "@/components/ui/Card";
import { Mascot, type MascotState } from "@/components/ui/Mascot";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleHelp,
  Gauge,
  Keyboard,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type FlashcardEntry = {
  id: string;
  term: string;
  meaningVi: string;
  partOfSpeech: string | null;
  ipa: string | null;
  exampleEn: string | null;
  exampleVi: string | null;
  audioUrl?: string | null;
  status?: "NEW" | "LEARNING" | "MASTERED";
};

type VocabularyFlashcardsProps = {
  entries: FlashcardEntry[];
  title?: string;
  showIpa?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onStatusChange?: (id: string, status: NonNullable<FlashcardEntry["status"]>) => void;
  onRemove?: (id: string) => void;
};

type StudyStatus = NonNullable<FlashcardEntry["status"]>;
type StudyState = { index: number; flipped: boolean };
type SpeedOption = { seconds: number; label: string; description: string };

const statusLabels: Record<StudyStatus, string> = {
  NEW: "Mới lưu",
  LEARNING: "Đang học",
  MASTERED: "Đã nhớ",
};

const speedOptions: SpeedOption[] = [
  { seconds: 8, label: "Chậm", description: "8 giây / bước" },
  { seconds: 5, label: "Chuẩn", description: "5 giây / bước" },
  { seconds: 3, label: "Nhanh", description: "3 giây / bước" },
];

const OPEN_STUDY_EVENT = "wewin:vocabulary:open-study";

function speak(entry: FlashcardEntry) {
  if (typeof window === "undefined") return;
  if (entry.audioUrl) {
    const audio = new Audio(entry.audioUrl);
    void audio.play().catch(() => undefined);
    return;
  }
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(entry.term);
  utterance.lang = "en-US";
  window.speechSynthesis.speak(utterance);
}

function normaliseIndex(index: number, length: number) {
  if (!length) return 0;
  return ((index % length) + length) % length;
}

function readStudyState(storageKey: string, length: number): StudyState | null {
  if (typeof window === "undefined" || !length) return null;
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as Partial<StudyState>;
    if (typeof parsed.index !== "number" || !Number.isFinite(parsed.index)) return null;
    return { index: normaliseIndex(parsed.index, length), flipped: parsed.flipped === true };
  } catch {
    return null;
  }
}

async function responseMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { message?: unknown; error?: unknown };
    const message = payload.message ?? payload.error;
    if (typeof message === "string" && message.trim()) return message;
  } catch {
    // Some API errors do not include JSON; keep the actionable fallback below.
  }
  return fallback;
}

export function VocabularyFlashcardLauncher({
  className,
  label = "Học flashcard",
  compact = false,
}: {
  className?: string;
  label?: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(OPEN_STUDY_EVENT))}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-btn)] bg-brand font-extrabold text-white shadow-[0_8px_18px_rgba(0,74,173,0.2)] transition hover:-translate-y-0.5 hover:bg-brand-dark active:translate-y-0",
        compact ? "px-4 text-xs" : "px-5 text-sm sm:px-6 sm:text-base",
        className,
      )}
    >
      <Sparkles className={compact ? "size-4" : "size-5"} aria-hidden="true" />
      {label}
      <ArrowRight className="size-4" aria-hidden="true" />
    </button>
  );
}

export function VocabularyFlashcards({
  entries,
  title = "Danh sách từ vựng",
  showIpa = true,
  emptyTitle = "Chưa có mục từ phù hợp",
  emptyDescription = "Thử đổi bộ lọc hoặc tìm kiếm bằng từ tiếng Anh hay nghĩa tiếng Việt.",
  onStatusChange,
  onRemove,
}: VocabularyFlashcardsProps) {
  const [items, setItems] = useState(entries);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flashcardIndex, setFlashcardIndex] = useState<number | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [speed, setSpeed] = useState(5);
  const [autoPlay, setAutoPlay] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [resumeState, setResumeState] = useState<StudyState | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const storageKey = useMemo(() => "wewin:vocabulary-study:" + title, [title]);

  useEffect(() => {
    setItems(entries);
    if (!entries.length) setFlashcardIndex(null);
  }, [entries]);

  useEffect(() => {
    if (!items.length || resumeState) return;
    setResumeState(readStudyState(storageKey, items.length));
  }, [items.length, resumeState, storageKey]);

  useEffect(() => {
    if (flashcardIndex === null) return;
    const state = { index: flashcardIndex, flipped };
    setResumeState(state);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Study state is a convenience; it should never prevent learning.
    }
  }, [flashcardIndex, flipped, storageKey]);

  const current = useMemo(() => {
    if (flashcardIndex === null || !items.length) return null;
    return items[normaliseIndex(flashcardIndex, items.length)];
  }, [flashcardIndex, items]);
  const studyOpen = flashcardIndex !== null;

  const nextCard = useCallback(() => {
    if (!items.length) return;
    setFlashcardIndex((index) => normaliseIndex((index ?? 0) + 1, items.length));
    setFlipped(false);
    setError(null);
  }, [items.length]);

  const previousCard = useCallback(() => {
    if (!items.length) return;
    setFlashcardIndex((index) => normaliseIndex((index ?? 0) - 1, items.length));
    setFlipped(false);
    setError(null);
  }, [items.length]);

  const openFlashcard = useCallback(
    (index?: number) => {
      if (!items.length) return;
      const startingIndex = index === undefined ? resumeState?.index ?? 0 : index;
      setFlashcardIndex(normaliseIndex(startingIndex, items.length));
      setFlipped(index === undefined ? Boolean(resumeState?.flipped) : false);
      setAutoPlay(false);
      setError(null);
    },
    [items.length, resumeState],
  );

  const closeFlashcard = useCallback(() => {
    setFlashcardIndex(null);
    setFlipped(false);
    setAutoPlay(false);
    setError(null);
  }, []);

  const updateStatus = useCallback(
    async (id: string, status: StudyStatus) => {
      setSavingId(id);
      setError(null);
      try {
        const response = await fetch("/api/vocabulary/progress", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ entryId: id, status }),
        });
        if (!response.ok) {
          setError(await responseMessage(response, "Không thể lưu tiến độ lúc này. Hãy kiểm tra kết nối rồi thử lại."));
          return false;
        }
        setItems((currentItems) => currentItems.map((entry) => (entry.id === id ? { ...entry, status } : entry)));
        notifyLearningActivity();
        onStatusChange?.(id, status);
        return true;
      } catch {
        setError("Không thể lưu tiến độ lúc này. Hãy kiểm tra kết nối rồi thử lại.");
        return false;
      } finally {
        setSavingId(null);
      }
    },
    [onStatusChange],
  );

  const removeFromNotebook = useCallback(
    async (id: string) => {
      setSavingId(id);
      setError(null);
      try {
        const response = await fetch("/api/vocabulary/progress", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ entryId: id }),
        });
        if (!response.ok) {
          setError(await responseMessage(response, "Không thể bỏ lưu từ này. Hãy kiểm tra kết nối rồi thử lại."));
          return false;
        }
        setItems((currentItems) => currentItems.map((entry) => (entry.id === id ? { ...entry, status: undefined } : entry)));
        notifyLearningActivity();
        onRemove?.(id);
        return true;
      } catch {
        setError("Không thể bỏ lưu từ này. Hãy kiểm tra kết nối rồi thử lại.");
        return false;
      } finally {
        setSavingId(null);
      }
    },
    [onRemove],
  );

  const toggleSaved = useCallback(
    (entry: FlashcardEntry) => {
      if (entry.status) void removeFromNotebook(entry.id);
      else void updateStatus(entry.id, "NEW");
    },
    [removeFromNotebook, updateStatus],
  );

  const markAndContinue = useCallback(
    async (status: StudyStatus) => {
      if (!current) return;
      const saved = await updateStatus(current.id, status);
      if (saved) nextCard();
    },
    [current, nextCard, updateStatus],
  );

  useEffect(() => {
    function handleOpenStudy() {
      openFlashcard();
    }
    window.addEventListener(OPEN_STUDY_EVENT, handleOpenStudy);
    return () => window.removeEventListener(OPEN_STUDY_EVENT, handleOpenStudy);
  }, [openFlashcard]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setReducedMotion(mediaQuery.matches);
    updateMotionPreference();
    mediaQuery.addEventListener?.("change", updateMotionPreference);
    return () => mediaQuery.removeEventListener?.("change", updateMotionPreference);
  }, []);

  useEffect(() => {
    if (reducedMotion) setAutoPlay(false);
  }, [reducedMotion]);

  useEffect(() => {
    if (flashcardIndex === null || !autoPlay || reducedMotion || !current) return;
    const timer = window.setTimeout(() => {
      if (flipped) nextCard();
      else setFlipped(true);
    }, speed * 1000);
    return () => window.clearTimeout(timer);
  }, [autoPlay, current, flipped, flashcardIndex, nextCard, reducedMotion, speed]);

  useEffect(() => {
    if (!studyOpen) {
      restoreFocusRef.current?.focus();
      restoreFocusRef.current = null;
      return;
    }

    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => dialogRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
    };
  }, [studyOpen]);

  useEffect(() => {
    if (flashcardIndex === null) return;
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select") || target?.isContentEditable) return;
      if (target?.closest("button, a") && event.key !== "Escape") return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeFlashcard();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        nextCard();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        previousCard();
      } else if (event.key === " ") {
        event.preventDefault();
        setFlipped((value) => !value);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeFlashcard, flashcardIndex, nextCard, previousCard]);

  if (!items.length) {
    return (
      <Card padding="lg" className="text-center">
        <CircleHelp className="mx-auto size-10 text-brand" aria-hidden="true" />
        <h2 className="mt-3 font-[family-name:var(--font-jakarta)] text-lg font-extrabold text-ink">{emptyTitle}</h2>
        <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-ink-muted">{emptyDescription}</p>
      </Card>
    );
  }

  const currentIndex = flashcardIndex === null ? 0 : normaliseIndex(flashcardIndex, items.length);
  const progressPercent = Math.round(((currentIndex + 1) / items.length) * 100);
  const currentMascot: MascotState = error ? "surprised" : current?.status === "MASTERED" ? "proud" : current?.status === "LEARNING" ? "determined" : flipped ? "focused" : "ready";

  return (
    <section aria-label={title}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-[family-name:var(--font-jakarta)] text-lg font-extrabold text-ink">{title}</h2>
        </div>
        <VocabularyFlashcardLauncher compact label="Học tiếp" />
      </div>

      {error && flashcardIndex === null ? (
        <div className="mb-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span className="break-words">{error}</span>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((entry, index) => {
          const saved = Boolean(entry.status);
          return (
            <Card key={entry.id} padding="md" className="flex min-h-[218px] min-w-0 flex-col transition hover:-translate-y-0.5 hover:border-brand/40">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => openFlashcard(index)}>
                  <span className="block break-words font-[family-name:var(--font-jakarta)] text-lg font-extrabold leading-snug text-ink hover:text-brand [overflow-wrap:anywhere]">{entry.term}</span>
                  {showIpa && entry.ipa ? <span className="mt-1 block break-words font-mono text-xs text-brand [overflow-wrap:anywhere]">{entry.ipa}</span> : null}
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    aria-label={"Nghe phát âm " + entry.term}
                    onClick={() => speak(entry)}
                    className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand transition hover:bg-brand-pink"
                  >
                    <Volume2 className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={saved ? "Bỏ lưu " + entry.term : "Lưu " + entry.term + " vào sổ tay"}
                    disabled={savingId === entry.id}
                    onClick={() => toggleSaved(entry)}
                    className={cn(
                      "flex size-10 items-center justify-center rounded-xl transition disabled:opacity-50",
                      saved ? "bg-[#F8D99D]/45 text-[#966A23]" : "bg-surface text-ink-muted hover:bg-brand-soft hover:text-brand",
                    )}
                  >
                    {saved ? <BookmarkCheck className="size-4" aria-hidden="true" /> : <Bookmark className="size-4" aria-hidden="true" />}
                  </button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {entry.partOfSpeech ? <span className="rounded-full bg-brand-soft px-2 py-1 text-[11px] font-bold text-brand">{entry.partOfSpeech}</span> : null}
                {entry.status ? <span className="rounded-full bg-surface px-2 py-1 text-[11px] font-semibold text-ink-muted">{statusLabels[entry.status]}</span> : null}
              </div>
              <p className="mt-3 break-words text-sm font-semibold leading-relaxed text-ink [overflow-wrap:anywhere]">{entry.meaningVi}</p>
              {entry.exampleEn ? (
                <div className="mt-auto border-t border-border/80 pt-3">
                  <p className="break-words text-xs italic leading-relaxed text-ink-muted [overflow-wrap:anywhere]">{entry.exampleEn}</p>
                  {entry.exampleVi ? <p className="mt-1 break-words text-xs leading-relaxed text-ink-faint [overflow-wrap:anywhere]">{entry.exampleVi}</p> : null}
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>

      {current ? (
        <div ref={dialogRef} className="fixed inset-0 z-[80] min-h-dvh overflow-y-auto bg-[#F8FAFC] text-ink" role="dialog" aria-modal="true" aria-labelledby="vocabulary-study-title" tabIndex={-1}>
          <header className="sticky top-0 z-10 border-b border-border bg-white/95 backdrop-blur">
            <div className="mx-auto flex min-h-[74px] w-full max-w-[1200px] items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6">
              <button type="button" onClick={closeFlashcard} aria-label="Đóng chế độ học flashcard" className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border text-ink-muted transition hover:border-brand hover:text-brand">
                <ArrowLeft className="size-5" aria-hidden="true" />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h1 id="vocabulary-study-title" className="break-words text-sm font-extrabold text-ink sm:text-base">Học flashcard</h1>
                  <span className="text-xs font-semibold tabular-nums text-ink-muted">{currentIndex + 1} / {items.length}</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-brand-soft" role="progressbar" aria-label="Tiến độ bộ flashcard" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}>
                  <div className="h-full rounded-full bg-brand" style={{ width: progressPercent + "%" }} />
                </div>
              </div>
              <div className="hidden items-center gap-2 text-xs text-ink-muted md:flex">
                <Keyboard className="size-4" aria-hidden="true" />
                <span>Space lật · ← → chuyển · Esc thoát</span>
              </div>
              <button type="button" onClick={closeFlashcard} aria-label="Đóng flashcard" className="flex size-11 shrink-0 items-center justify-center rounded-xl text-ink-muted transition hover:bg-surface hover:text-ink md:hidden">
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
          </header>

          <main className="mx-auto grid w-full max-w-[1200px] gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_236px] lg:gap-8 lg:py-10">
            <div className="min-w-0">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand">{title}</p>
                  <p className="mt-1 text-sm text-ink-muted">Tập trung vào một thẻ, rồi chọn mức độ nhớ của bạn.</p>
                </div>
                <span className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-ink-muted">{current.status ? statusLabels[current.status] : "Chưa đánh dấu"}</span>
              </div>

              <button
                type="button"
                onClick={() => setFlipped((value) => !value)}
                className="group relative flex min-h-[420px] w-full min-w-0 flex-col overflow-hidden rounded-[28px] border-2 border-brand/15 bg-white text-center shadow-[0_20px_60px_rgba(0,58,140,0.1)] transition hover:border-brand/35 focus-visible:border-brand sm:min-h-[500px] lg:min-h-[560px]"
                aria-label={flipped ? "Mặt sau: " + current.meaningVi + ". Chạm để xem lại từ." : "Mặt trước: " + current.term + ". Chạm để xem nghĩa."}
              >
                <span className="pointer-events-none absolute left-5 top-5 size-3 rounded-full bg-[#F8D99D] sm:left-7 sm:top-7" aria-hidden="true" />
                <span className="pointer-events-none absolute right-5 top-5 size-2 rounded-full bg-brand/20 sm:right-7 sm:top-7" aria-hidden="true" />
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-5 py-12 sm:px-10 sm:py-16">
                  {flipped ? (
                    <>
                      <span className="rounded-full bg-brand-soft px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.16em] text-brand">Mặt sau · Nghĩa &amp; cách dùng</span>
                      {showIpa ? <span className="mt-6 max-w-full break-words font-mono text-base text-brand sm:text-lg [overflow-wrap:anywhere]">{current.ipa || "IPA chưa cập nhật"}</span> : null}
                      <span className={`${showIpa ? "mt-5" : "mt-6"} max-w-3xl break-words text-[clamp(2rem,5vw,4rem)] font-extrabold leading-tight text-ink [overflow-wrap:anywhere]`}>{current.meaningVi}</span>
                      {current.partOfSpeech ? <span className="mt-5 rounded-full border border-brand/20 bg-brand-soft px-3 py-1.5 text-xs font-bold text-brand">{current.partOfSpeech}</span> : null}
                      {current.exampleEn ? (
                        <div className="mt-8 max-w-2xl border-t border-border px-4 pt-5">
                          <p className="break-words text-sm italic leading-relaxed text-ink-muted sm:text-base [overflow-wrap:anywhere]">{current.exampleEn}</p>
                          {current.exampleVi ? <p className="mt-2 break-words text-sm leading-relaxed text-ink-faint [overflow-wrap:anywhere]">{current.exampleVi}</p> : null}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <span className="rounded-full bg-brand-soft px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.16em] text-brand">Mặt trước · Từ / cụm từ</span>
                      <span className="mt-7 max-w-full break-words text-[clamp(2.75rem,8vw,6.4rem)] font-extrabold leading-[1.05] text-brand [overflow-wrap:anywhere]">{current.term}</span>
                      <span className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-ink-muted"><span className="rounded-md border border-border bg-surface px-2 py-1 font-mono text-xs">Space</span> để lật thẻ</span>
                    </>
                  )}
                </div>
                <span className="border-t border-border bg-[#FBFCFF] px-5 py-3 text-xs font-semibold text-ink-muted">{flipped ? "Chạm để quay lại mặt trước" : "Chạm vào thẻ hoặc nhấn Space để xem nghĩa"}</span>
              </button>

              {error ? (
                <div className="mt-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
                  <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 break-words leading-relaxed">{error}</span>
                  <button type="button" onClick={() => setError(null)} className="ml-auto shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-red-700 underline underline-offset-2 hover:bg-red-100">Đóng</button>
                </div>
              ) : null}

              <div className="mt-5 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:gap-3">
                <button type="button" onClick={previousCard} aria-label="Thẻ trước" className="flex min-h-12 min-w-12 items-center justify-center rounded-xl border border-border bg-white text-ink-muted transition hover:border-brand hover:text-brand">
                  <ChevronLeft className="size-5" aria-hidden="true" />
                </button>
                <button type="button" onClick={() => setFlipped((value) => !value)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-extrabold text-white shadow-[0_8px_18px_rgba(0,74,173,0.18)] transition hover:bg-brand-dark sm:px-6">
                  <RotateCcw className="size-4" aria-hidden="true" />
                  <span>Lật thẻ</span>
                  <span className="hidden rounded-md bg-white/15 px-1.5 py-0.5 font-mono text-[11px] sm:inline">Space</span>
                </button>
                <button type="button" onClick={nextCard} aria-label="Thẻ tiếp theo" className="flex min-h-12 min-w-12 items-center justify-center rounded-xl border border-border bg-white text-ink-muted transition hover:border-brand hover:text-brand">
                  <ChevronRight className="size-5" aria-hidden="true" />
                </button>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)]">
                <button type="button" onClick={() => speak(current)} aria-label={"Nghe phát âm " + current.term} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-bold text-ink-muted transition hover:border-brand hover:text-brand">
                  <Volume2 className="size-4" aria-hidden="true" /> Nghe phát âm
                </button>
                <button type="button" disabled={savingId === current.id} onClick={() => toggleSaved(current)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-soft px-4 text-sm font-extrabold text-brand transition hover:bg-brand-pink disabled:cursor-not-allowed disabled:opacity-50">
                  {current.status ? <BookmarkCheck className="size-4" aria-hidden="true" /> : <Bookmark className="size-4" aria-hidden="true" />}
                  {current.status ? "Đã lưu trong sổ tay" : "Lưu vào sổ tay"}
                </button>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button type="button" disabled={savingId === current.id} onClick={() => void markAndContinue("LEARNING")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-bold text-ink-muted transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-50">
                  <RotateCcw className="size-4" aria-hidden="true" /> Chưa nhớ · thẻ tiếp
                </button>
                <button type="button" disabled={savingId === current.id} onClick={() => void markAndContinue("MASTERED")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#F8D99D] px-4 text-sm font-extrabold text-[#61430F] transition hover:bg-[#F5CC7B] disabled:cursor-not-allowed disabled:opacity-50">
                  <Check className="size-4" aria-hidden="true" /> Đã nhớ · thẻ tiếp
                </button>
              </div>
            </div>

            <aside className="rounded-[24px] border border-border bg-white p-4 shadow-[0_10px_28px_rgba(0,58,140,0.06)] sm:p-5 lg:mt-10">
              <div className="flex items-center gap-4 lg:block lg:text-center">
                <Mascot state={currentMascot} size={108} animated className="shrink-0 lg:mx-auto lg:size-[150px]" />
                <div className="min-w-0 lg:mt-3">
                  <p className="text-sm font-extrabold text-ink">{flipped ? "Tốt lắm, kiểm tra lại ngữ cảnh nhé!" : "Bạn nhớ được từ này không?"}</p>
                </div>
              </div>

              <div className="mt-5 border-t border-border pt-4">
                <label htmlFor="flashcard-speed" className="flex items-center gap-2 text-xs font-extrabold text-ink"><Gauge className="size-4 text-brand" aria-hidden="true" /> Tốc độ học</label>
                <select id="flashcard-speed" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} className="mt-2 min-h-11 w-full rounded-xl border border-border bg-white px-3 text-sm font-bold text-ink outline-none transition focus:border-brand">
                  {speedOptions.map((option) => <option key={option.seconds} value={option.seconds}>{option.label} · {option.description}</option>)}
                </select>
                <button type="button" disabled={reducedMotion} aria-pressed={autoPlay} onClick={() => setAutoPlay((value) => !value)} className={cn("mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border px-3 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-50", autoPlay ? "border-brand bg-brand-soft text-brand" : "border-border bg-white text-ink-muted hover:border-brand hover:text-brand")}>
                  {autoPlay ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
                  {autoPlay ? "Tạm dừng tự động" : "Bật tự động lật"}
                </button>
                {reducedMotion ? <p className="mt-2 text-xs leading-relaxed text-ink-muted">Tự động lật đã tắt vì bạn đang bật giảm chuyển động.</p> : null}
              </div>

              <div className="mt-5 border-t border-border pt-4">
                <p className="flex items-center gap-2 text-xs font-extrabold text-ink"><Keyboard className="size-4 text-brand" aria-hidden="true" /> Phím tắt</p>
                <dl className="mt-3 space-y-2 text-xs text-ink-muted">
                  <div className="flex items-center justify-between gap-3"><dt>Space</dt><dd>Lật thẻ</dd></div>
                  <div className="flex items-center justify-between gap-3"><dt>← / →</dt><dd>Chuyển thẻ</dd></div>
                  <div className="flex items-center justify-between gap-3"><dt>Esc</dt><dd>Thoát</dd></div>
                </dl>
              </div>
            </aside>
          </main>
        </div>
      ) : null}
    </section>
  );
}
