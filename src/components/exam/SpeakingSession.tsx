"use client";

import { AlertCircle, CheckCircle2, LoaderCircle, Mic, Play, RotateCcw, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type SpeakingPart = {
  id: string;
  title: string;
  prompt: string;
  questions: readonly string[];
  audioUrl?: string;
  preparationSeconds?: number;
  speakingSeconds?: number;
};

type Recording = {
  audioData?: string;
  status: string;
  error?: string;
  serverSaved?: boolean;
};

type SpeakingPhase = "ready" | "permission" | "question" | "preparation" | "recording" | "saving" | "done" | "error";

type Props = {
  unit: SpeakingPart;
  recording?: Recording;
  onStart: () => Promise<boolean | undefined>;
  onStop: () => Promise<void>;
  onEnableMicrophone: () => Promise<boolean>;
  onRetrySave?: () => Promise<void>;
};

const DEFAULT_PREPARATION_SECONDS = 60;
const DEFAULT_SPEAKING_SECONDS = 180;

/**
 * Runs one speaking part from permission, through the prompt and preparation,
 * to recording and persisted playback. Permission is only requested from a
 * click handler; the timer transition calls onStart directly.
 */
export function SpeakingSession({ unit, recording, onStart, onStop, onEnableMicrophone, onRetrySave }: Props) {
  const preparationSeconds = unit.preparationSeconds ?? DEFAULT_PREPARATION_SECONDS;
  const speakingSeconds = unit.speakingSeconds ?? (unit.id === "speaking-3" ? 240 : DEFAULT_SPEAKING_SECONDS);

  const [phase, setPhase] = useState<SpeakingPhase>(recording?.status === "saved" ? "done" : "ready");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");

  const phaseRef = useRef<SpeakingPhase>(phase);
  const mountedRef = useRef(true);
  const generationRef = useRef(0);
  const actionBusyRef = useRef(false);
  const finishingRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const cancelCountdownRef = useRef<(() => void) | null>(null);
  const questionAudioRef = useRef<HTMLAudioElement | null>(null);
  const cancelQuestionRef = useRef<(() => void) | null>(null);
  const callbacksRef = useRef({ onStart, onStop, onEnableMicrophone, onRetrySave });

  callbacksRef.current = { onStart, onStop, onEnableMicrophone, onRetrySave };

  const transition = useCallback((next: SpeakingPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const clearCountdown = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const cancel = cancelCountdownRef.current;
    cancelCountdownRef.current = null;
    cancel?.();
  }, []);

  const cancelQuestion = useCallback(() => {
    const cancel = cancelQuestionRef.current;
    cancelQuestionRef.current = null;
    const audio = questionAudioRef.current;
    questionAudioRef.current = null;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.currentTime = 0;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    cancel?.();
  }, []);

  const isCurrent = useCallback((generation: number) => mountedRef.current && generation === generationRef.current, []);

  const waitForCountdown = useCallback(
    (length: number, generation: number) => {
      clearCountdown();
      const duration = Math.max(0, Math.floor(length));
      setSeconds(duration);
      return new Promise<boolean>((resolve) => {
        let finished = false;
        const finish = (completed: boolean) => {
          if (finished) return;
          finished = true;
          if (timerRef.current !== null) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
          }
          if (cancelCountdownRef.current === cancel) cancelCountdownRef.current = null;
          resolve(completed);
        };
        const cancel = () => finish(false);
        cancelCountdownRef.current = cancel;
        const deadline = Date.now() + duration * 1000;
        const tick = () => {
          if (!isCurrent(generation)) {
            finish(false);
            return;
          }
          const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
          setSeconds(remaining);
          if (remaining === 0) finish(true);
        };
        tick();
        if (duration === 0) finish(true);
        else timerRef.current = window.setInterval(tick, 250);
      });
    },
    [clearCountdown, isCurrent],
  );

  const playQuestion = useCallback(
    async (generation: number) => {
      transition("question");

      if (unit.audioUrl) {
        const audio = new Audio(unit.audioUrl);
        audio.preload = "auto";
        questionAudioRef.current = audio;
        const played = await new Promise<boolean>((resolve, reject) => {
          let settled = false;
          const settle = (completed: boolean, failure?: Error) => {
            if (settled) return;
            settled = true;
            if (questionAudioRef.current === audio) questionAudioRef.current = null;
            if (cancelQuestionRef.current === cancel) cancelQuestionRef.current = null;
            audio.onended = null;
            audio.onerror = null;
            if (failure) reject(failure);
            else resolve(completed);
          };
          const cancel = () => settle(false);
          cancelQuestionRef.current = cancel;
          audio.onended = () => settle(true);
          audio.onerror = () => settle(false, new Error("Chưa phát được câu hỏi. Bạn có thể đọc đề rồi bấm Bắt đầu nói."));
          void audio.play().catch(() => settle(false, new Error("Chưa phát được câu hỏi. Bạn có thể đọc đề rồi bấm Bắt đầu nói.")));
        });
        return played && isCurrent(generation);
      }

      if (!("speechSynthesis" in window)) {
        throw new Error("Trình duyệt không phát được audio câu hỏi. Bạn có thể đọc đề rồi bấm Bắt đầu nói.");
      }

      const text = [unit.prompt, ...unit.questions].filter(Boolean).join(". ");
      const spoken = await new Promise<boolean>((resolve, reject) => {
        const speech = new SpeechSynthesisUtterance(text);
        let settled = false;
        const settle = (completed: boolean, failure?: Error) => {
          if (settled) return;
          settled = true;
          if (cancelQuestionRef.current === cancel) cancelQuestionRef.current = null;
          speech.onend = null;
          speech.onerror = null;
          if (failure) reject(failure);
          else resolve(completed);
        };
        const cancel = () => settle(false);
        cancelQuestionRef.current = cancel;
        speech.lang = "en-US";
        speech.onend = () => settle(true);
        speech.onerror = () => settle(false, new Error("Chưa phát được câu hỏi. Bạn có thể đọc đề rồi bấm Bắt đầu nói."));
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(speech);
      });
      return spoken && isCurrent(generation);
    },
    [isCurrent, transition, unit.audioUrl, unit.prompt, unit.questions],
  );

  const startRecorder = useCallback(
    async (generation: number) => {
      if (!isCurrent(generation)) return false;
      try {
        const started = await callbacksRef.current.onStart();
        if (!isCurrent(generation)) return false;
        if (started !== true) {
          transition("error");
          setError("Micro chưa sẵn sàng. Hãy bật micro rồi thử lại.");
          return false;
        }
        transition("recording");
        return true;
      } catch (cause) {
        if (isCurrent(generation)) {
          transition("error");
          setError(cause instanceof Error ? cause.message : "Không thể bắt đầu ghi âm.");
        }
        return false;
      }
    },
    [isCurrent, transition],
  );

  const finishRecording = useCallback(
    async (generation: number) => {
      if (!isCurrent(generation) || phaseRef.current !== "recording" || finishingRef.current) return;
      finishingRef.current = true;
      clearCountdown();
      transition("saving");
      try {
        await callbacksRef.current.onStop();
        if (isCurrent(generation)) {
          setSeconds(0);
          transition("done");
        }
      } catch (cause) {
        if (isCurrent(generation)) {
          setError(cause instanceof Error ? cause.message : "Chưa lưu được bản ghi.");
          transition("error");
        }
      } finally {
        finishingRef.current = false;
      }
    },
    [clearCountdown, isCurrent, transition],
  );

  const startWithPermission = useCallback(async () => {
    if (actionBusyRef.current || ["permission", "question", "preparation", "recording", "saving"].includes(phaseRef.current)) return;
    const generation = ++generationRef.current;
    actionBusyRef.current = true;
    clearCountdown();
    cancelQuestion();
    setError("");
    transition("permission");
    try {
      const access = await callbacksRef.current.onEnableMicrophone();
      if (!isCurrent(generation)) return;
      if (!access) {
        setError("Chưa cấp quyền micro. Hãy cho phép micro rồi thử lại.");
        transition("error");
        return;
      }
      const started = await startRecorder(generation);
      if (!started || !isCurrent(generation)) return;
      const completed = await waitForCountdown(speakingSeconds, generation);
      if (completed && isCurrent(generation)) await finishRecording(generation);
    } catch (cause) {
      if (isCurrent(generation)) {
        setError(cause instanceof Error ? cause.message : "Không thể mở micro.");
        transition("error");
      }
    } finally {
      if (isCurrent(generation)) actionBusyRef.current = false;
    }
  }, [cancelQuestion, clearCountdown, finishRecording, isCurrent, speakingSeconds, startRecorder, transition, waitForCountdown]);

  const beginQuestionFlow = useCallback(async () => {
    if (actionBusyRef.current || ["permission", "question", "preparation", "recording", "saving"].includes(phaseRef.current)) return;
    const generation = ++generationRef.current;
    actionBusyRef.current = true;
    clearCountdown();
    cancelQuestion();
    setError("");
    transition("permission");
    try {
      // The permission call is awaited directly from this click. It is never
      // repeated after the preparation timer; onStart uses the already-open stream.
      const access = await callbacksRef.current.onEnableMicrophone();
      if (!isCurrent(generation)) return;
      if (!access) {
        setError("Chưa cấp quyền micro. Hãy cho phép micro rồi thử lại.");
        transition("error");
        return;
      }
      const played = await playQuestion(generation);
      if (!played || !isCurrent(generation)) return;
      transition("preparation");
      const prepared = await waitForCountdown(preparationSeconds, generation);
      if (!prepared || !isCurrent(generation)) return;
      const started = await startRecorder(generation);
      if (!started || !isCurrent(generation)) return;
      const completed = await waitForCountdown(speakingSeconds, generation);
      if (completed && isCurrent(generation)) await finishRecording(generation);
    } catch (cause) {
      if (isCurrent(generation)) {
        setError(cause instanceof Error ? cause.message : "Không thể phát câu hỏi.");
        transition("error");
      }
    } finally {
      if (isCurrent(generation)) actionBusyRef.current = false;
    }
  }, [cancelQuestion, clearCountdown, finishRecording, isCurrent, playQuestion, preparationSeconds, speakingSeconds, startRecorder, transition, waitForCountdown]);

  const cancelPendingPermission = useCallback(() => {
    if (phaseRef.current !== "permission") return;
    generationRef.current += 1;
    clearCountdown();
    cancelQuestion();
    actionBusyRef.current = false;
    setError("");
    transition("ready");
  }, [cancelQuestion, clearCountdown, transition]);

  const retrySave = useCallback(async () => {
    const retry = callbacksRef.current.onRetrySave;
    if (!retry || actionBusyRef.current || recording?.status !== "error" || !recording.audioData) return;
    actionBusyRef.current = true;
    setError("");
    transition("saving");
    try {
      await retry();
      if (mountedRef.current) transition("done");
    } catch (cause) {
      if (mountedRef.current) {
        setError(cause instanceof Error ? cause.message : "Chưa lưu được bản ghi.");
        transition("error");
      }
    } finally {
      actionBusyRef.current = false;
    }
  }, [recording?.audioData, recording?.status, transition]);

  useEffect(() => {
    mountedRef.current = true;
    if (recording?.status === "saved") transition("done");
    else if (recording?.status === "saving") transition("saving");
    else if (recording?.status === "error") {
      transition("error");
      if (recording.error) setError(recording.error);
    }
  }, [recording?.error, recording?.status, transition]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
      clearCountdown();
      cancelQuestion();
    };
  }, [cancelQuestion, clearCountdown]);

  const locked = ["question", "preparation", "recording", "saving"].includes(phase);
  const savedAudio = recording?.audioData || null;
  const statusText =
    phase === "permission"
      ? "Đang chờ quyền micro…"
      : phase === "question"
        ? "Đang phát câu hỏi…"
        : phase === "preparation"
          ? `Chuẩn bị: ${seconds} giây`
          : phase === "recording"
            ? `Đang ghi âm · còn ${seconds} giây`
            : phase === "saving"
              ? "Đang lưu bản ghi…"
              : phase === "done"
                ? "Bản ghi đã hoàn thành"
                : phase === "error"
                  ? "Cần xử lý lại bản ghi"
                  : "Sẵn sàng ghi âm";

  return (
    <section className="mx-auto w-full max-w-4xl space-y-5" aria-labelledby={`speaking-title-${unit.id}`}>
      <header>
        <p className="text-sm font-semibold text-brand">{unit.title}</p>
        <h2 id={`speaking-title-${unit.id}`} className="mt-2 text-2xl font-bold">Phần thi nói</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Nghe câu hỏi → chuẩn bị {preparationSeconds} giây → nói {speakingSeconds} giây → tự lưu bản ghi.
        </p>
      </header>

      <div className="rounded-2xl border border-border bg-white p-6">
        <p className="text-lg font-semibold">{unit.prompt}</p>
        {unit.questions.length > 0 ? (
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed">
            {unit.questions.map((question, index) => <li key={`${unit.id}-question-${index}`}>{question}</li>)}
          </ul>
        ) : null}
      </div>

      <div className="rounded-2xl border border-brand-soft bg-brand-soft/40 p-6">
        <p role="status" aria-live="polite" className="flex items-center gap-2 font-semibold">
          {phase === "recording" ? <span className="size-2.5 animate-pulse rounded-full bg-[#D92D20]" aria-hidden="true" /> : null}
          {phase === "saving" ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
          {statusText}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={locked || phase === "permission"}
            onClick={() => void beginQuestionFlow()}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-brand bg-white px-5 font-semibold text-brand disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play size={18} aria-hidden="true" />
            Nghe câu hỏi và chuẩn bị
          </button>
          <button
            type="button"
            disabled={locked || phase === "permission"}
            onClick={() => void startWithPermission()}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Mic size={18} aria-hidden="true" />
            Bắt đầu nói
          </button>
          {phase === "permission" ? (
            <button
              type="button"
              onClick={cancelPendingPermission}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#A62B20] bg-white px-5 font-semibold text-[#A62B20]"
            >
              Hủy chờ quyền
            </button>
          ) : null}
          {phase === "recording" ? (
            <button
              type="button"
              onClick={() => void finishRecording(generationRef.current)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-brand bg-white px-5 font-semibold text-brand"
            >
              <Square size={16} aria-hidden="true" />
              Kết thúc và lưu
            </button>
          ) : null}
        </div>
        <p className="mt-3 text-xs text-ink-muted">
          Cho phép micro khi trình duyệt hỏi. Nếu cửa sổ quyền không xuất hiện, mở biểu tượng quyền trên thanh địa chỉ rồi thử lại.
        </p>
      </div>

      {error ? (
        <div role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      ) : null}

      {savedAudio ? (
        <div className="rounded-2xl border border-[#B7DEC7] bg-[#F4FBF6] p-5">
          <h3 className="flex items-center gap-2 font-semibold text-[#1F7A4D]"><CheckCircle2 className="size-4" aria-hidden="true" />Nghe lại phần trả lời</h3>
          <audio controls preload="metadata" src={savedAudio} className="mt-3 w-full" aria-label={`Bản ghi ${unit.title}`} />
          <p className="mt-2 text-sm text-[#1F7A4D]">{recording?.serverSaved ? "Bản ghi đã lưu trên máy chủ." : "Bản ghi chưa lưu lên máy chủ."}</p>
          {recording?.status === "error" && onRetrySave ? (
            <button
              type="button"
              onClick={() => void retrySave()}
              disabled={phase === "saving"}
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw size={16} aria-hidden="true" />
              Thử lưu lại
            </button>
          ) : null}
        </div>
      ) : null}

    </section>
  );
}
