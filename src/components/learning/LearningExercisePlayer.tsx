"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { LearningExercise, LearningExerciseQuestion } from "@/lib/learning-exercise";

type LearningExercisePlayerProps = {
  exercise: LearningExercise;
  audioSrc?: string;
};

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function answerClass(question: LearningExerciseQuestion, selected: string | undefined, optionIndex: number, submitted: boolean) {
  if (!submitted) return "border-2 border-ink/15 bg-white";
  if (question.answerIndex === null) return "border-2 border-ink/15 bg-white";
  if (optionIndex === question.answerIndex) return "border-2 border-accent-green bg-green-50 text-green-800";
  if (selected === String(optionIndex)) return "border-2 border-red-300 bg-red-50 text-red-800";
  return "border-2 border-ink/15 bg-white";
}

function questionCardClass(question: LearningExerciseQuestion, selected: string | undefined, submitted: boolean) {
  if (!submitted || question.answerIndex === null || selected === undefined) return "border-ink/20";
  return selected === String(question.answerIndex) ? "border-accent-green" : "border-red-300";
}

export function LearningExercisePlayer({ exercise, audioSrc }: LearningExercisePlayerProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [writing, setWriting] = useState("");
  const [remaining, setRemaining] = useState(exercise.durationMinutes * 60);
  const [submitted, setSubmitted] = useState(false);
  const [automaticSubmit, setAutomaticSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [recording, setRecording] = useState<"idle" | "recording" | "saved">("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [recordingError, setRecordingError] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (submitted) return;
    const timer = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [submitted]);

  useEffect(() => {
    if (!submitted && remaining === 0) void submit(true);
    // The timer intentionally submits only once when it reaches zero.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, submitted]);

  useEffect(() => {
    if (recording !== "recording") return;
    const timer = window.setInterval(() => setRecordingSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);
  }, [recordingUrl]);

  async function startRecording() {
    setRecordingError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setRecordingError("Trình duyệt này chưa hỗ trợ ghi âm. Hãy thử Chrome hoặc Edge.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((mime) => MediaRecorder.isTypeSupported(mime));
      const recorder = preferredMime ? new MediaRecorder(stream, { mimeType: preferredMime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setRecordingUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(blob); });
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setRecording("saved");
      };
      streamRef.current = stream;
      recorderRef.current = recorder;
      setRecordingSeconds(0);
      setRecording("recording");
      recorder.start();
    } catch {
      setRecordingError("Không thể mở micro. Hãy cấp quyền micro trong trình duyệt rồi thử lại.");
    }
  }

  async function stopRecording() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    await new Promise<void>((resolve) => {
      const done = () => resolve();
      recorder.addEventListener("stop", done, { once: true });
      recorder.stop();
    });
    recorderRef.current = null;
  }

  async function submit(automatic = false) {
    if (submitted || submitting) return;
    setSubmitting(true);
    if (exercise.skill === "SPEAKING" && recording === "recording") await stopRecording();
    setAutomaticSubmit(automatic);
    setSubmitted(true);
    setSubmitting(false);
  }

  function choose(questionId: string, value: string) {
    if (submitted) return;
    setAnswers((current) => ({ ...current, [questionId]: value }));
  }

  const isWriting = exercise.skill === "WRITING";
  const isSpeaking = exercise.skill === "SPEAKING";
  const isReading = exercise.skill === "READING";
  const questionCount = exercise.questions.length;

  return (
    <div className="space-y-5">
      <Card className="sticky top-3 z-10 border-2 border-brand/30 bg-white/95 shadow-lg backdrop-blur" padding="sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-brand">Phiên luyện tập</p>
            <p className="mt-1 text-sm font-semibold text-ink">{questionCount} hoạt động · {exercise.durationMinutes} phút</p>
          </div>
          <div className={cn("rounded-xl border-2 px-4 py-2 text-center", remaining <= 60 && !submitted ? "border-red-300 bg-red-50 text-red-700" : "border-brand/30 bg-brand-soft text-brand")} aria-live="polite">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em]">Thời gian còn lại</p>
            <p className="font-mono text-xl font-extrabold">{formatTime(remaining)}</p>
          </div>
        </div>
        {automaticSubmit ? <p role="status" className="mt-3 text-sm font-semibold text-red-700">Hết giờ. Bài đã được nộp tự động.</p> : null}
      </Card>

      {isReading || isWriting ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
          <SourcePanel exercise={exercise} submitted={submitted} audioSrc={audioSrc} />
          <QuestionPanel exercise={exercise} answers={answers} submitted={submitted} onChoose={choose} writing={writing} setWriting={setWriting} />
        </div>
      ) : (
        <>
          <SourcePanel exercise={exercise} submitted={submitted} audioSrc={audioSrc} />
          <QuestionPanel exercise={exercise} answers={answers} submitted={submitted} onChoose={choose} writing={writing} setWriting={setWriting} />
        </>
      )}

      {isSpeaking ? (
        <Card className="border-2 border-brand/20" padding="lg">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-ink">Ghi âm câu trả lời</h2>
              <p className="mt-1 text-sm text-ink-muted">Bản ghi chỉ dùng để bạn nghe lại trong phiên này, không chấm điểm tự động.</p>
            </div>
            <span className={cn("rounded-lg px-3 py-1.5 font-mono text-sm font-bold", recording === "recording" ? "bg-red-50 text-red-700" : "bg-surface text-ink-muted")}>{formatTime(recordingSeconds)}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {recording !== "recording" ? <Button type="button" onClick={() => void startRecording()} disabled={submitted || submitting}>{recording === "saved" ? "Ghi âm lại" : "Bắt đầu ghi âm"}</Button> : <Button type="button" variant="outline" onClick={() => void stopRecording()}>Dừng ghi âm</Button>}
          </div>
          {recordingUrl ? <audio className="mt-4 w-full" controls src={recordingUrl} aria-label="Bản ghi câu trả lời của bạn" /> : null}
          {recordingError ? <p role="alert" className="mt-3 text-sm text-red-700">{recordingError}</p> : null}
        </Card>
      ) : null}

      {submitted ? <SubmissionReview exercise={exercise} audioSrc={audioSrc} /> : null}

      <Card className="border-2 border-brand/20" padding="lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-ink">{submitted ? "Đã nộp bài" : "Hoàn tất phiên luyện"}</h2>
            <p className="mt-1 text-sm text-ink-muted">{submitted ? "Đáp án, transcript và bài mẫu đã được mở để bạn tự đối chiếu." : "Kiểm tra lại câu trả lời rồi nộp để xem phần đối chiếu."}</p>
          </div>
          {!submitted ? <Button type="button" disabled={submitting} onClick={() => void submit()}>{submitting ? "Đang nộp…" : "Nộp bài"}</Button> : null}
        </div>
      </Card>
    </div>
  );
}

function SourcePanel({ exercise, submitted, audioSrc }: { exercise: LearningExercise; submitted: boolean; audioSrc?: string }) {
  const title = exercise.skill === "LISTENING" ? "Ngữ liệu nghe" : exercise.skill === "READING" ? "Bài đọc" : exercise.skill === "WRITING" ? "Đề bài" : "Đề nói";
  return (
    <Card className="border-2 border-ink/15" padding="lg">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-brand">{title}</p>
      {exercise.skill === "LISTENING" && audioSrc ? <audio className="mt-4 w-full" controls preload="metadata" src={audioSrc} aria-label="Audio bài luyện" /> : null}
      {exercise.sourceText && exercise.skill !== "LISTENING" && (exercise.skill !== "SPEAKING" || !exercise.speakingQuestions.length) ? <p className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-ink">{exercise.sourceText}</p> : null}
      {exercise.skill === "SPEAKING" && exercise.speakingQuestions.length ? <ol className="mt-4 list-decimal space-y-2 pl-5 text-[15px] leading-7 text-ink">{exercise.speakingQuestions.map((question) => <li key={question}>{question}</li>)}</ol> : null}
      {exercise.skill === "LISTENING" && submitted && exercise.transcript ? <RevealBlock title="Lời thoại audio">{exercise.transcript}</RevealBlock> : null}
      {exercise.skill === "SPEAKING" && exercise.strategy ? <HintBlock title="Cách triển khai">{exercise.strategy}</HintBlock> : null}
      {exercise.vocabulary.length ? <div className="mt-5"><p className="text-sm font-extrabold text-ink">Từ và ý gợi ý</p><div className="mt-2 flex flex-wrap gap-2">{exercise.vocabulary.map((item) => <span key={item} className="rounded-lg border border-brand/25 bg-brand-soft px-2.5 py-1.5 text-xs font-semibold text-brand">{item}</span>)}</div></div> : null}
      {exercise.writingInstructions.length ? <div className="mt-5"><p className="text-sm font-extrabold text-ink">Các ý cần đáp ứng</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-ink-muted">{exercise.writingInstructions.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
      {exercise.preparationSeconds ? <p className="mt-5 rounded-xl bg-surface px-3 py-2 text-sm text-ink-muted">Chuẩn bị: <strong className="text-ink">{exercise.preparationSeconds} giây</strong>{exercise.speakingSeconds ? ` · Nói mục tiêu: ${exercise.speakingSeconds} giây` : ""}</p> : null}
    </Card>
  );
}

function QuestionPanel({ exercise, answers, submitted, onChoose, writing, setWriting }: { exercise: LearningExercise; answers: Record<string, string>; submitted: boolean; onChoose: (id: string, value: string) => void; writing: string; setWriting: (value: string) => void }) {
  return (
    <div className="space-y-4">
      {exercise.questions.map((question) => (
        <Card key={question.id} className={cn("border-2", questionCardClass(question, answers[question.id], submitted))} padding="lg">
          <div className="flex items-start gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-ink text-sm font-extrabold text-white">{question.number}</span><div className="min-w-0 flex-1"><p className="font-extrabold leading-6 text-ink">{question.prompt}</p>{question.options.length ? <div className="mt-4 grid gap-2">{question.options.map((option, index) => { const selected = answers[question.id] === String(index); return <button key={`${question.id}-${option}`} type="button" disabled={submitted} aria-pressed={selected} onClick={() => onChoose(question.id, String(index))} className={cn("min-h-12 rounded-xl px-4 py-3 text-left text-sm font-semibold transition", answerClass(question, answers[question.id], index, submitted), selected && !submitted && "border-brand bg-brand-soft text-brand")}>{String.fromCharCode(65 + index)}. {option}{submitted && question.answerIndex === index ? <span className="ml-2 text-xs font-extrabold text-accent-green">Đáp án đúng</span> : null}</button>; })}</div> : null}{exercise.skill === "WRITING" ? <WritingBox value={writing} disabled={submitted} onChange={setWriting} /> : null}{submitted ? <AnswerReview question={question} selected={answers[question.id]} /> : null}</div></div>
        </Card>
      ))}
      {!exercise.questions.length ? <Card className="border-2 border-ink/15"><p className="text-sm text-ink-muted">Bộ bài chưa có câu hỏi hợp lệ để tương tác. Hãy kiểm tra lại mẫu nội dung trong trang quản trị.</p></Card> : null}
    </div>
  );
}

function WritingBox({ value, disabled, onChange }: { value: string; disabled: boolean; onChange: (value: string) => void }) {
  return <div className="mt-5"><label className="text-sm font-extrabold text-ink" htmlFor="learning-writing-answer">Câu trả lời của bạn</label><textarea id="learning-writing-answer" disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} rows={14} className="mt-2 w-full rounded-xl border-2 border-ink/25 bg-white p-4 text-sm leading-7 text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15 disabled:bg-surface" placeholder="Viết câu trả lời tại đây…" /><p className="mt-2 text-xs text-ink-muted">{value.trim() ? value.trim().split(/\s+/).length : 0} từ</p></div>;
}

function AnswerReview({ question, selected }: { question: LearningExerciseQuestion; selected?: string }) {
  const selectedIndex = selected === undefined ? null : Number(selected);
  return <div className="mt-5 space-y-3 rounded-xl border border-brand/20 bg-brand-soft/40 p-4 text-sm"><p className="font-bold text-ink">Bạn chọn: <span className="font-semibold">{selectedIndex !== null && question.options[selectedIndex] ? question.options[selectedIndex] : "Chưa trả lời"}</span></p>{question.answerIndex !== null && question.options[question.answerIndex] ? <p className="font-bold text-brand">Đáp án: {question.options[question.answerIndex]}</p> : null}{question.explanation ? <p className="leading-6 text-ink"><strong>Giải thích:</strong> {question.explanation}</p> : null}{question.evidence ? <p className="leading-6 text-ink-muted"><strong>Bằng chứng:</strong> {question.evidence}</p> : null}{question.distractors ? <p className="leading-6 text-ink-muted"><strong>Phương án khác:</strong> {question.distractors}</p> : null}</div>;
}

function RevealBlock({ title, children }: { title: string; children: string }) {
  return <div className="mt-5 rounded-xl border border-brand/20 bg-brand-soft/40 p-4"><p className="text-sm font-extrabold text-brand">{title}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink">{children}</p></div>;
}

function HintBlock({ title, children }: { title: string; children: string }) {
  return <div className="mt-5 rounded-xl border border-border bg-surface p-4"><p className="text-sm font-extrabold text-ink">{title}</p><p className="mt-2 text-sm leading-6 text-ink-muted">{children}</p></div>;
}

function SubmissionReview({ exercise, audioSrc }: { exercise: LearningExercise; audioSrc?: string }) {
  if (!exercise.sample && !exercise.sampleAnalysis && !exercise.checklist.length && !(exercise.skill === "SPEAKING" && audioSrc)) return null;
  return <Card className="border-2 border-accent-green/30 bg-green-50/40" padding="lg">
    <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-accent-green">Tự đối chiếu sau khi nộp</p>
    {exercise.skill === "SPEAKING" && audioSrc ? <div className="mt-4"><p className="text-sm font-extrabold text-ink">Audio bài mẫu</p><audio className="mt-2 w-full" controls preload="metadata" src={audioSrc} aria-label="Audio bài nói mẫu" /></div> : null}
    {exercise.sample ? <RevealBlock title={exercise.skill === "WRITING" ? "Bài viết mẫu" : "Script bài mẫu"}>{exercise.sample}</RevealBlock> : null}
    {exercise.sampleAnalysis ? <HintBlock title="Phân tích bằng tiếng Việt">{exercise.sampleAnalysis}</HintBlock> : null}
    {exercise.checklist.length ? <div className="mt-5 rounded-xl border border-border bg-white p-4"><p className="text-sm font-extrabold text-ink">Checklist tự sửa</p><ul className="mt-2 space-y-2 text-sm text-ink">{exercise.checklist.map((item) => <li key={item}>☐ {item}</li>)}</ul></div> : null}
  </Card>;
}
