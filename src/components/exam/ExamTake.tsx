"use client";

import { upload as uploadBlob } from "@vercel/blob/client";
import { openMicrophone } from "@/lib/microphone";
import { SpeakingSession } from "./SpeakingSession";
import { PersonalVocabularyModal } from "@/components/vocabulary/PersonalVocabularyModal";
import type { ExamFixture, ExamSkill } from "@/lib/exam-config";
import type { VstepQuestion, VstepTest1Public } from "@/lib/vstep-test-1-public";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  FileText,
  Headphones,
  LoaderCircle,
  LockKeyhole,
  Mic,
  Play,
  RotateCcw,
  Send,
  ShieldCheck,
  Star,
  Timer,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type ExamCandidate = {
  id?: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
};

export type ExamCatalogCode = "FULL" | "LISTENING" | "READING" | "WRITING" | "SPEAKING";
type Props = { exam: ExamFixture; candidate?: ExamCandidate; catalog?: ExamCatalogCode };
type Stage = "preflight" | "exam" | "submitted";
type Answers = Record<string, string>;
type WritingAnswers = Record<string, string>;
type PermissionState = "unknown" | "granted" | "denied" | "unsupported";
type RecordingStatus = "recording" | "saving" | "saved" | "error";

export type SavedRecording = {
  startedAt: string;
  stoppedAt: string;
  durationSeconds: number;
  audioData?: string;
  mimeType: string;
  storageKey?: string;
  storageUrl?: string;
  playbackUrl?: string;
  sizeBytes?: number;
};

type RecordingEntry = SavedRecording & {
  status: RecordingStatus;
  error?: string;
  serverSaved?: boolean;
};
type RecordingState = Record<string, RecordingEntry>;
type ScoreSummary = { correct?: number; total?: number; score?: number };
type ReviewItem = {
  id?: string;
  questionId?: string;
  prompt?: string;
  selectedAnswer?: string | null;
  answer?: string | null;
  correctAnswer?: string | null;
  passage?: string | null;
  isCorrect?: boolean | null;
  bookmarked?: boolean;
};
type SubmitResult = {
  id?: string;
  attemptId?: string;
  listening?: ScoreSummary;
  reading?: ScoreSummary;
  writingStatus?: string;
  speakingStatus?: string;
  overallScore?: number | null;
  writingScore?: number | null;
  speakingScore?: number | null;
  writing?: unknown;
  speaking?: unknown;
  review?: unknown;
  answers?: unknown;
  grading?: unknown;
  bookmarks?: { questionId: string }[];
};

type RecorderSession = {
  key: string;
  recorder: MediaRecorder;
  chunks: Blob[];
  startedAt: string;
  done: Promise<void>;
  resolveDone: () => void;
  rejectDone: (error: Error) => void;
  settled: boolean;
};

export function ExamTake({ exam, candidate, catalog = "FULL" }: Props) {
  const content = exam.content;
  const [stage, setStage] = useState<Stage>("preflight");
  const catalogSkillIndex = catalog === "LISTENING" ? 0 : catalog === "READING" ? 1 : catalog === "WRITING" ? 2 : catalog === "SPEAKING" ? 3 : 0;
  const [skillIndex, setSkillIndex] = useState(catalogSkillIndex);
  const [unitIndex, setUnitIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [writingAnswers, setWritingAnswers] = useState<WritingAnswers>({});
  const [recordings, setRecordings] = useState<RecordingState>({});
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<SubmitResult | null>(null);
  const [audioChecked, setAudioChecked] = useState(false);
  const [audioStarted, setAudioStarted] = useState(false);
  const [microphoneState, setMicrophoneState] = useState<PermissionState>("unknown");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(getDurationSeconds(exam, catalog));

  const preflightAudioRef = useRef<HTMLAudioElement | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const recorderSessionRef = useRef<RecorderSession | null>(null);
  const recordingSavePromiseRef = useRef<Promise<void> | null>(null);
  const lastSavePromiseRef = useRef<Promise<void> | null>(null);
  const mountedRef = useRef(true);
  const stageRef = useRef<Stage>("preflight");
  const attemptIdRef = useRef<string | null>(null);
  const skillIndexRef = useRef(0);
  const unitIndexRef = useRef(0);
  const answersRef = useRef<Answers>({});
  const writingAnswersRef = useRef<WritingAnswers>({});
  const recordingsRef = useRef<RecordingState>({});
  const startingRef = useRef(false);
  const submittingRef = useRef(false);
  const activeRecordingKeyRef = useRef<string | null>(null);
  const microphoneRequestRef = useRef<Promise<boolean> | null>(null);

  useEffect(()=>{
    const id=new URLSearchParams(window.location.search).get("attempt");
    if(!id)return;
    let cancelled=false;
    void fetch(`/api/exams/attempts/${encodeURIComponent(id)}`).then(async response=>{
      if(!response.ok)throw new Error("Không tải được kết quả lượt thi.");
      const data=await response.json();
      if(cancelled||data.status!=="SUBMITTED")return;
      setAttemptId(id);setSubmittedResult({...data,id});
      setWritingAnswers(data.writingAnswers||{});setAnswers(data.answers||{});
      setRecordings(Object.fromEntries(Object.entries(data.recordings||{}).map(([key,value])=>[key,restoreRecording(value)])));
      setBookmarks(new Set((data.bookmarks ?? []).map((item: { questionId: string }) => item.questionId)));
      setStage("submitted");
    }).catch(error=>{if(!cancelled)setErrorMessage(error.message);});
    return ()=>{cancelled=true;};
  },[]);

  const skill = exam.parts[skillIndex]?.skill ?? "listening";
  const skillLabel = exam.parts[skillIndex]?.title ?? "Listening";
  const units = useMemo(() => getUnits(exam, content, skill), [content, exam, skill]);
  const activeUnit = units[Math.min(unitIndex, Math.max(units.length - 1, 0))];
  const activeRecordingKey = getUnitId(activeUnit, `${skill}-${unitIndex + 1}`);
  const audioSource = content?.listening.parts[0]?.audioUrl;
  const answeredCount = countAnswered(answers, writingAnswers, recordings);
  const totalQuestions = content ? catalogQuestionCount(content, catalog) : exam.questions;
  const activeRecording = recordings[activeRecordingKey];
  const recordingBusy = Object.values(recordings).some((entry) => entry.status === "recording" || entry.status === "saving");
  const displayName = candidate?.name?.trim() || candidate?.email?.trim() || "Tài khoản WEWIN";
  const accountLabel = candidate?.email?.trim() || "Tài khoản hiện tại";

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    skillIndexRef.current = skillIndex;
    unitIndexRef.current = unitIndex;
    activeRecordingKeyRef.current = activeRecordingKey;
  }, [activeRecordingKey, skillIndex, unitIndex]);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    writingAnswersRef.current = writingAnswers;
  }, [writingAnswers]);

  useEffect(() => {
    recordingsRef.current = recordings;
  }, [recordings]);

  useEffect(() => {
    if (stage !== "exam") return;
    const timer = window.setInterval(() => setTimeLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [stage]);

  const updateRecordings = useCallback((updater: (current: RecordingState) => RecordingState) => {
    const next = updater(recordingsRef.current);
    recordingsRef.current = next;
    setRecordings(next);
    return next;
  }, []);

  const toggleBookmark = useCallback(async (questionId: string) => {
    const id = attemptIdRef.current;
    if (!id || candidate?.role === "GUEST") {
      setErrorMessage("Bookmark câu hỏi cần tài khoản đăng nhập.");
      return;
    }
    const selected = bookmarks.has(questionId);
    const response = await fetch(`/api/exams/attempts/${encodeURIComponent(id)}/bookmarks`, {
      method: selected ? "DELETE" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId }),
    });
    if (!response.ok) throw new Error("Không thể cập nhật bookmark câu hỏi.");
    setBookmarks((current) => {
      const next = new Set(current);
      if (selected) next.delete(questionId); else next.add(questionId);
      return next;
    });
  }, [bookmarks, candidate?.role]);

  const requestMicrophone = useCallback(async (): Promise<boolean> => {
    if (microphoneStreamRef.current?.active) {
      setMicrophoneState("granted");
      return true;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setMicrophoneState("unsupported");
      const message = "Trình duyệt này không hỗ trợ ghi âm. Hãy mở bài luyện bằng trình duyệt khác.";
      setErrorMessage(message);
      throw new Error(message);
    }

    // Keep one browser permission request alive at a time. Cancelling the
    // Speaking UI cannot abort getUserMedia itself, so a quick retry must wait
    // on this request instead of opening a second permission prompt.
    const inFlight = microphoneRequestRef.current;
    if (inFlight) return inFlight;

    microphoneStreamRef.current?.getTracks().forEach((track) => track.stop());
    microphoneStreamRef.current = null;
    const request = (async (): Promise<boolean> => {
      try {
        const stream = await openMicrophone();
        if (!mountedRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return false;
        }
        microphoneStreamRef.current = stream;
        setMicrophoneState("granted");
        return true;
      } catch (error) {
        setMicrophoneState("denied");
        const message = error instanceof Error ? error.message : "Không thể truy cập micro.";
        setErrorMessage(message);
        throw new Error(message);
      }
    })();
    microphoneRequestRef.current = request;
    void request.then(
      () => {
        if (microphoneRequestRef.current === request) microphoneRequestRef.current = null;
      },
      () => {
        if (microphoneRequestRef.current === request) microphoneRequestRef.current = null;
      },
    );
    return request;
  }, []);

  const saveProgress = useCallback(async (recordingOverride?: RecordingState) => {
    const id = attemptIdRef.current;
    if (!id || stageRef.current !== "exam") return;

    const run = async () => {
      if (!mountedRef.current) return;
      setSaving(true);
      try {
        const response = await fetch(`/api/exams/attempts/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers: answersRef.current,
            writingAnswers: writingAnswersRef.current,
            recordings: serializeRecordings(recordingOverride ?? recordingsRef.current),
            currentPart: catalog === "FULL" ? skillIndexRef.current : 0,
            currentUnit: unitIndexRef.current,
            currentSkill: (exam.parts[skillIndexRef.current]?.skill ?? "listening").toUpperCase(),
          }),
        });
        if (!response.ok) throw new Error("Không thể lưu tiến độ.");
      } finally {
        if (mountedRef.current) setSaving(false);
      }
    };

    // Keep blob persistence ordered. Debounced answer saves must not race an audio upload.
    const previous = lastSavePromiseRef.current;
    if (previous) await previous.catch(() => undefined);
    const current = run();
    lastSavePromiseRef.current = current;
    await current;
  }, [catalog, exam.parts]);

  const saveRecordingBlob = useCallback(async (partId: string, blob: Blob, metadata: { startedAt: string; stoppedAt: string; durationSeconds: number }) => {
    const id = attemptIdRef.current;
    if (!id) throw new Error("Không có mã lượt thi để lưu bản ghi.");
    const capabilityResponse = await fetch(`/api/exams/attempts/${encodeURIComponent(id)}/recordings/upload`, { cache: "no-store" });
    const capabilities = await capabilityResponse.json().catch(() => ({})) as { directUpload?: boolean; serverUpload?: boolean; error?: string };
    if (!capabilityResponse.ok) throw new Error(capabilities.error || "Không kiểm tra được nơi lưu bản ghi.");
    if (!capabilities.directUpload && !capabilities.serverUpload) throw new Error("Blob storage chưa được kết nối với deployment hiện tại. Hãy redeploy Vercel rồi thử lại.");

    let response: Response;
    if (capabilities.directUpload) {
      const mimeType = (blob.type || "audio/webm").split(";", 1)[0];
      const pathname = `exam-recordings/${id}/${partId}-${crypto.randomUUID()}${recordingExtension(mimeType)}`;
      const uploaded = await uploadBlob(pathname, blob, {
        access: "private",
        contentType: mimeType,
        multipart: blob.size > 5 * 1024 * 1024,
        handleUploadUrl: `/api/exams/attempts/${encodeURIComponent(id)}/recordings/upload`,
        clientPayload: JSON.stringify({ attemptId: id, partId }),
      });
      response = await fetch(`/api/exams/attempts/${encodeURIComponent(id)}/recordings/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...metadata, partId, pathname: uploaded.pathname, url: uploaded.url }),
      });
    } else {
      const form = new FormData();
      form.append("partId", partId);
      form.append("file", new File([blob], `${partId}${recordingExtension(blob.type)}`, { type: blob.type || "audio/webm" }));
      form.append("startedAt", metadata.startedAt);
      form.append("stoppedAt", metadata.stoppedAt);
      form.append("durationSeconds", String(metadata.durationSeconds));
      response = await fetch(`/api/exams/attempts/${encodeURIComponent(id)}/recordings`, { method: "POST", body: form });
    }
    const data = await response.json().catch(() => ({})) as { recording?: SavedRecording; error?: string };
    if (!response.ok || !data.recording) throw new Error(data.error || "Không thể lưu bản ghi.");
    return data.recording;
  }, []);

  const finalizeRecording = useCallback(
    async (session: RecorderSession) => {
      if (session.settled) return;
      if (!mountedRef.current) {
        session.settled = true;
        session.resolveDone();
        return;
      }

      const stoppedAt = new Date().toISOString();
      try {
        const blob = new Blob(session.chunks, { type: session.recorder.mimeType || "audio/webm" });
        if (!blob.size) throw new Error("Bản ghi không có dữ liệu âm thanh.");
        const audioData = await blobToDataUrl(blob);
        if (!audioData || audioData.length < 32) throw new Error("Không thể đọc dữ liệu âm thanh.");

        const durationSeconds = Math.max(1, Math.round((Date.parse(stoppedAt) - Date.parse(session.startedAt)) / 1000));
        const pendingEntry: RecordingEntry = {
          startedAt: session.startedAt,
          stoppedAt,
          durationSeconds,
          audioData,
          mimeType: blob.type || "audio/webm",
          status: "saving",
          serverSaved: false,
        };
        updateRecordings((current) => ({ ...current, [session.key]: pendingEntry }));
        const savePromise = (async () => {
          const saved = await saveRecordingBlob(session.key, blob, { startedAt: session.startedAt, stoppedAt, durationSeconds });
          const savedState = updateRecordings((current) => ({
            ...current,
            [session.key]: { ...current[session.key], ...saved, audioData, status: "saved", serverSaved: true },
          }));
          await saveProgress(savedState);
        })();
        recordingSavePromiseRef.current = savePromise;
        await savePromise;
        session.settled = true;
        session.resolveDone();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Không thể lưu bản ghi.";
        if (mountedRef.current) {
          updateRecordings((current) => ({
            ...current,
            [session.key]: {
              ...(current[session.key] ?? emptyRecordingEntry(session.startedAt)),
              status: "error",
              serverSaved: false,
              error: message,
            },
          }));
          setErrorMessage(`${session.key}: ${message}`);
        }
        session.settled = true;
        session.rejectDone(new Error(message));
      } finally {
        if (recorderSessionRef.current === session) recorderSessionRef.current = null;
        // The upload promise is separate from MediaRecorder's completion promise.
        // Clear it after this session so a later submit does not await stale work.
        recordingSavePromiseRef.current = null;
      }
    },
    [saveProgress, saveRecordingBlob, updateRecordings],
  );

  const beginRecording = useCallback(async () => {
    if (recorderSessionRef.current) return false;
    const key = activeRecordingKeyRef.current;
    const stream = microphoneStreamRef.current;

    if (!key || !stream?.active) {
      setErrorMessage("Micro chưa sẵn sàng. Hãy cho phép micro trong phần Nói rồi thử lại.");
      if (key) updateRecordings((current) => ({ ...current, [key]: { ...emptyRecordingEntry(new Date().toISOString()), status: "error", error: "Micro chưa sẵn sàng." } }));
      return false;
    }
    if (typeof MediaRecorder === "undefined") {
      setErrorMessage("Trình duyệt này không hỗ trợ ghi âm.");
      updateRecordings((current) => ({ ...current, [key]: { ...emptyRecordingEntry(new Date().toISOString()), status: "error", error: "Trình duyệt không hỗ trợ ghi âm." } }));
      return false;
    }

    const startedAt = new Date().toISOString();
    try {
      const recorder = createRecorder(stream);
      let resolveDone!: () => void;
      let rejectDone!: (error: Error) => void;
      const done = new Promise<void>((resolve, reject) => {
        resolveDone = resolve;
        rejectDone = (error) => reject(error);
      });
      const session: RecorderSession = {
        key,
        recorder,
        chunks: [],
        startedAt,
        done,
        resolveDone,
        rejectDone,
        settled: false,
      };
      // Navigation can interrupt the speaking state machine; consume rejected cleanup promises.
      void done.catch(() => undefined);
      recorder.ondataavailable = (event) => {
        if (event.data.size) session.chunks.push(event.data);
      };
      recorder.onerror = () => {
        if (!session.settled) {
          session.settled = true;
          updateRecordings((current) => ({
            ...current,
            [key]: { ...emptyRecordingEntry(startedAt), status: "error", error: "Ghi âm bị gián đoạn." },
          }));
          setErrorMessage("Ghi âm bị gián đoạn. Hãy thử lại phần Nói.");
          session.rejectDone(new Error("Ghi âm bị gián đoạn."));
        }
      };
      recorder.onstop = () => {
        void finalizeRecording(session);
      };
      recorder.start(250);
      recorderSessionRef.current = session;
      updateRecordings((current) => ({
        ...current,
        [key]: { ...emptyRecordingEntry(startedAt), startedAt, status: "recording", serverSaved: false },
      }));
      setErrorMessage(null);
      return true;
    } catch {
      updateRecordings((current) => ({ ...current, [key]: { ...emptyRecordingEntry(startedAt), status: "error", error: "Không thể khởi động ghi âm." } }));
      setErrorMessage("Không thể khởi động ghi âm. Hãy kiểm tra micro rồi thử lại.");
      return false;
    }
  }, [finalizeRecording, updateRecordings]);

  const stopRecording = useCallback(async () => {
    const session = recorderSessionRef.current;
    if (!session) return;
    if (session.recorder.state === "recording" || session.recorder.state === "paused") {
      if (mountedRef.current) {
        updateRecordings((current) => (current[session.key] ? { ...current, [session.key]: { ...current[session.key], status: "saving" } } : current));
      }
      try {
        session.recorder.stop();
      } catch {
        if (!session.settled) {
          session.settled = true;
          updateRecordings((current) => ({
            ...current,
            [session.key]: { ...emptyRecordingEntry(session.startedAt), status: "error", error: "Không thể dừng ghi âm." },
          }));
          session.rejectDone(new Error("Không thể dừng ghi âm."));
        }
      }
    }
    await session.done;
  }, [updateRecordings]);

  const retryRecordingSave = useCallback(async () => {
    const key = activeRecordingKeyRef.current;
    const entry = key ? recordingsRef.current[key] : undefined;
    if (!key || !entry?.audioData) throw new Error("Không còn dữ liệu ghi âm để lưu lại.");
    updateRecordings((current) => ({ ...current, [key]: { ...entry, status: "saving", error: undefined, serverSaved: false } }));
    try {
      const blob = await blobFromAudioSource(entry.audioData);
      const saved = await saveRecordingBlob(key, blob, { startedAt: entry.startedAt, stoppedAt: entry.stoppedAt, durationSeconds: entry.durationSeconds });
      const savedState = updateRecordings((current) => ({ ...current, [key]: { ...current[key], ...saved, status: "saved", error: undefined, serverSaved: true } }));
      await saveProgress(savedState);
    } catch (error) {
      updateRecordings((current) => ({ ...current, [key]: { ...current[key], status: "error", error: error instanceof Error ? error.message : "Không thể lưu bản ghi.", serverSaved: false } }));
      throw error;
    }
  }, [saveProgress, saveRecordingBlob, updateRecordings]);

  const beginExam = useCallback(async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    setStarting(true);
    setErrorMessage(null);

    preflightAudioRef.current?.pause();
    try {
      if (candidate?.role === "GUEST") {
        const sessionResponse = await fetch("/api/exams/guest-session", { method: "POST", credentials: "same-origin" });
        if (!sessionResponse.ok) throw new Error("Không thể tạo phiên học thử. Hãy thử lại.");
      }
      const response = await fetch("/api/exams/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ program: exam.program, slug: exam.slug, catalog }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Không thể bắt đầu lượt thi.");
      }
      const data = (await response.json()) as { id?: string; attemptId?: string; expiresAt?: string };
      const id = data.id ?? data.attemptId;
      if (!id) throw new Error("Máy chủ chưa trả về mã lượt thi.");
      const restoredResponse=await fetch(`/api/exams/attempts/${id}`, { cache: "no-store" });
      if(!restoredResponse.ok)throw new Error("Chưa tải được bài làm đã lưu.");
      const restored=await restoredResponse.json();
      setAnswers(restored.answers||{});answersRef.current=restored.answers||{};
      setWritingAnswers(restored.writingAnswers||{});writingAnswersRef.current=restored.writingAnswers||{};
      const restoredRecordings=Object.fromEntries(Object.entries(restored.recordings||{}).map(([key,value])=>[key,restoreRecording(value)]));
      setRecordings(restoredRecordings);recordingsRef.current=restoredRecordings;
      const bookmarkResponse = await fetch(`/api/exams/attempts/${encodeURIComponent(id)}/bookmarks`, { cache: "no-store" });
      if (bookmarkResponse.ok) {
        const bookmarkData = await bookmarkResponse.json() as { bookmarks?: { questionId: string }[] };
        setBookmarks(new Set((bookmarkData.bookmarks ?? []).map((item) => item.questionId)));
      }
      setSkillIndex(catalog === "FULL" ? restored.currentPart || 0 : catalogSkillIndex);setUnitIndex(restored.currentUnit||0);
      attemptIdRef.current = id;
      setAttemptId(id);
      if (restored.status === "SUBMITTED") {
        setSubmittedResult({ ...restored, id, attemptId: id });
        setStage("submitted");
        return;
      }
      const expiresAt = data.expiresAt ?? restored.expiresAt;
      if (expiresAt) {
        const expiry = Date.parse(expiresAt);
        const seconds = Math.floor((expiry - Date.now()) / 1000);
        if (Number.isFinite(seconds)) setTimeLeft(Math.max(0,seconds));
      }
      setStage("exam");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Không thể bắt đầu lượt thi.");
      microphoneStreamRef.current?.getTracks().forEach((track) => track.stop());
      microphoneStreamRef.current = null;
      setMicrophoneState("unknown");
    } finally {
      startingRef.current = false;
      if (mountedRef.current) setStarting(false);
    }
  }, [candidate?.role, catalog, catalogSkillIndex, exam.program, exam.slug]);

  useEffect(() => {
    if (catalog === "FULL" || stage !== "preflight") return;
    void beginExam();
  }, [beginExam, catalog, stage]);

  const submitExam = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setConfirmSubmit(false);
    setErrorMessage(null);

    try {
      if (recorderSessionRef.current) await stopRecording();
      if (recordingSavePromiseRef.current) await recordingSavePromiseRef.current;

      const failedRecording = Object.entries(recordingsRef.current).find(([, entry]) => entry.status === "error");
      const pendingRecording = Object.entries(recordingsRef.current).find(([, entry]) => entry.status === "recording" || entry.status === "saving");
      if (pendingRecording) throw new Error(`${pendingRecording[0]} chưa được lưu xong.`);
      if (failedRecording) throw new Error(`${failedRecording[0]} chưa có bản ghi hợp lệ. Hãy thử lại trước khi nộp.`);

      // Flush text answers before submit so the server grades one coherent snapshot.
      await saveProgress();
      const id = attemptIdRef.current;
      if (!id) throw new Error("Không có mã lượt thi để nộp.");
      const response = await fetch(`/api/exams/attempts/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: answersRef.current,
          writingAnswers: writingAnswersRef.current,
          recordings: serializeRecordings(recordingsRef.current),
        }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Không thể nộp bài.");
      }
      const result = (await response.json()) as SubmitResult;

      setSubmittedResult({ ...result, id: result.id ?? result.attemptId ?? id, attemptId: id });
      const query = new URLSearchParams(window.location.search);
      query.set("attempt", id);
      window.history.replaceState(null,"",`${window.location.pathname}?${query.toString()}`);
      setStage("submitted");
      microphoneStreamRef.current?.getTracks().forEach((track) => track.stop());
      microphoneStreamRef.current = null;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Không thể nộp bài.");
    } finally {
      submittingRef.current = false;
      if (mountedRef.current) setSubmitting(false);
    }
  }, [saveProgress, stopRecording]);

  useEffect(() => {
    if (stage !== "exam" || timeLeft !== 0 || submittingRef.current) return;
    void submitExam();
  }, [stage, submitExam, timeLeft]);

  useEffect(() => {
    if (!attemptId || stage !== "exam") return;
    const timer = window.setTimeout(() => {
      void saveProgress().catch((error) => {
        if (mountedRef.current) setErrorMessage(error instanceof Error ? error.message : "Không thể lưu tiến độ.");
      });
    }, 650);
    return () => window.clearTimeout(timer);
  }, [answers, attemptId, recordings, saveProgress, stage, writingAnswers]);

  useEffect(() => {
    mountedRef.current = true;
    const preflightAudio=preflightAudioRef.current;
    const warnBeforeLeaving=(event:BeforeUnloadEvent)=>{if(stageRef.current==="exam"){event.preventDefault();event.returnValue="";}};
    window.addEventListener("beforeunload",warnBeforeLeaving);
    return () => {
      mountedRef.current = false;
      const session = recorderSessionRef.current;
      if (session && (session.recorder.state === "recording" || session.recorder.state === "paused")) {
        try {
          session.recorder.stop();
        } catch {
          // The route is leaving; tracks are still stopped below.
        }
      }
      microphoneStreamRef.current?.getTracks().forEach((track) => track.stop());
      microphoneStreamRef.current = null;
      preflightAudio?.pause();
      window.removeEventListener("beforeunload",warnBeforeLeaving);
    };
  }, []);

  function selectSkill(index: number) {
    if (recordingBusy) {
      setErrorMessage("Hãy đợi bản ghi được lưu trước khi chuyển phần.");
      return;
    }
    if (catalog !== "FULL") return;
    setSkillIndex(index);
    skillIndexRef.current = index;
    setUnitIndex(0);
    unitIndexRef.current = 0;
  }

  function selectUnit(index: number) {
    if (recordingBusy) {
      setErrorMessage("Hãy đợi bản ghi được lưu trước khi chuyển câu.");
      return;
    }
    setUnitIndex(index);
    unitIndexRef.current = index;
  }

  function handleAnswer(id: string, value: string) {
    const next = { ...answersRef.current, [id]: value };
    answersRef.current = next;
    setAnswers(next);
  }

  function handleWriting(id: string, value: string) {
    const next = { ...writingAnswersRef.current, [id]: value };
    writingAnswersRef.current = next;
    setWritingAnswers(next);
  }

  async function playPreflightAudio(reset: boolean) {
    const audio = preflightAudioRef.current;
    if (!audio) return;
    if (reset) audio.currentTime = 0;
    try {
      await audio.play();
      setAudioStarted(true);
      setAudioChecked(true);
    } catch {
      setErrorMessage("Không thể phát audio. Hãy kiểm tra âm lượng hoặc tải lại trang.");
    }
  }

  if (stage === "submitted") {
    return <ResultScreen exam={exam} result={submittedResult ?? { id: attemptId ?? undefined }} candidate={candidate} writingAnswers={writingAnswers} recordings={recordings} />;
  }

  if (stage === "preflight") {
    if (catalog !== "FULL") {
      return <SkillStartScreen catalog={catalog} errorMessage={errorMessage} starting={starting} onRetry={() => void beginExam()} />;
    }
    return <PreflightScreen exam={exam} catalog={catalog} candidate={candidate} audioSource={audioSource} audioChecked={audioChecked} audioStarted={audioStarted} audioRef={preflightAudioRef} microphoneState={microphoneState} errorMessage={errorMessage} starting={starting} onPlayAudio={() => void playPreflightAudio(false)} onReplayAudio={() => void playPreflightAudio(true)} onStart={() => void beginExam()} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex min-h-screen flex-col bg-[#F8FAFC]">
      <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-white px-3 md:px-8">
        <div className="flex min-w-0 items-center gap-3"><Image src="/brand/mascot-right-clear.png" alt="Mascot WEWIN" width={34} height={34} className="size-9 shrink-0 object-contain" /><div className="min-w-0"><p className="truncate text-sm font-extrabold text-ink md:text-base">{displayName}</p><p className="hidden truncate text-[11px] text-ink-muted sm:block">{accountLabel}</p></div></div>
        <div className="flex shrink-0 items-center gap-2 rounded-full bg-brand px-3 py-1.5 text-white md:px-5"><Timer className="size-4" aria-hidden="true" /><span className="font-mono text-base font-extrabold tracking-widest md:text-xl">{formatTime(timeLeft)}</span></div>
        <div className="flex items-center gap-2 md:gap-4"><span className="hidden text-xs text-ink-muted sm:inline">Đã trả lời: <b className="text-ink">{answeredCount}/{totalQuestions}</b></span><button type="button" onClick={() => setConfirmSubmit(true)} disabled={submitting} className="flex min-h-11 items-center gap-1.5 rounded-[var(--radius-btn)] bg-brand px-3 text-xs font-extrabold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50 md:px-4 md:text-sm">{submitting ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-3.5" aria-hidden="true" />}{submitting ? "Đang nộp" : "Nộp bài"}</button></div>
      </header>
      <main className="min-h-0 flex-1 overflow-auto px-3 py-5 md:px-8 md:py-6"><div className="mx-auto flex min-h-full max-w-[1260px] flex-col"><div className="mb-4 flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-extrabold uppercase tracking-[0.15em] text-brand">{exam.title} · {skillLabel}</p><p className="mt-1 text-sm text-ink-muted">{exam.subtitle}</p></div><span className="hidden shrink-0 text-xs text-ink-faint md:inline">{saving ? "Đang lưu…" : attemptId ? "Đã lưu tự động" : "Chưa có phiên thi"}</span></div>{errorMessage ? <div role="alert" className="mb-4 flex items-start gap-2 rounded-2xl border border-[#F0B7B0] bg-[#FFF7F5] px-4 py-3 text-sm text-[#9B2C20]"><AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><p>{errorMessage}</p></div> : null}{renderExamPart({ exam, content, skill, activeUnit, answers, writingAnswers, recordings, bookmarks, activeRecording, canAddToNotebook: candidate?.role !== "GUEST", audioRef: preflightAudioRef, setAudioStarted, onAnswer: handleAnswer, onBookmark: (questionId) => void toggleBookmark(questionId).catch((error) => setErrorMessage(error instanceof Error ? error.message : "Không thể cập nhật bookmark.")), onWriting: handleWriting, onStartRecording: beginRecording, onStopRecording: stopRecording, onEnableMicrophone: requestMicrophone, onRetryRecording: retryRecordingSave })}</div></main>
      <ExamBottomNav catalog={catalog} exam={exam} content={content} skillIndex={skillIndex} unitIndex={unitIndex} recordingBusy={recordingBusy} onSkill={selectSkill} onUnit={selectUnit} onPrevious={() => (unitIndex > 0 ? selectUnit(unitIndex - 1) : catalog === "FULL" && skillIndex > 0 ? selectSkill(skillIndex - 1) : undefined)} onNext={() => (unitIndex < units.length - 1 ? selectUnit(unitIndex + 1) : catalog === "FULL" && skillIndex < exam.parts.length - 1 ? selectSkill(skillIndex + 1) : setConfirmSubmit(true))} onSave={() => void saveProgress().catch((error) => setErrorMessage(error instanceof Error ? error.message : "Không thể lưu tiến độ."))} />
      <SubmitModal open={confirmSubmit} busy={submitting} onClose={() => setConfirmSubmit(false)} onSubmit={() => void submitExam()} hasPendingRecording={recordingBusy} />
    </div>
  );
}

function getDurationSeconds(exam: ExamFixture, catalog: ExamCatalogCode) {
  const duration = catalog === "FULL" ? exam.duration : exam.parts.find((part) => part.skill === catalog.toLowerCase())?.duration ?? exam.duration;
  const match = duration.match(/(\d+)/);
  return (match ? Number(match[1]) : 60) * 60;
}

function formatTime(value: number) {
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = String(value % 60).padStart(2, "0");
  return hours ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${seconds}` : `${String(minutes).padStart(2, "0")}:${seconds}`;
}

function getUnitId(unit: unknown, fallback: string) {
  if (unit && typeof unit === "object" && "id" in unit && typeof unit.id === "string") return unit.id;
  return fallback;
}

function emptyRecordingEntry(startedAt: string): RecordingEntry {
  return { startedAt, stoppedAt: "", durationSeconds: 0, audioData: "", mimeType: "", status: "error", serverSaved: false };
}

function restoreRecording(value: unknown): RecordingEntry {
  const saved = value && typeof value === "object" && !Array.isArray(value) ? value as Partial<SavedRecording> : {};
  return {
    startedAt: typeof saved.startedAt === "string" ? saved.startedAt : "",
    stoppedAt: typeof saved.stoppedAt === "string" ? saved.stoppedAt : "",
    durationSeconds: typeof saved.durationSeconds === "number" ? saved.durationSeconds : 0,
    audioData: typeof saved.audioData === "string" ? saved.audioData : typeof saved.playbackUrl === "string" ? saved.playbackUrl : "",
    mimeType: typeof saved.mimeType === "string" ? saved.mimeType : "audio/webm",
    storageKey: typeof saved.storageKey === "string" ? saved.storageKey : undefined,
    storageUrl: typeof saved.storageUrl === "string" ? saved.storageUrl : undefined,
    playbackUrl: typeof saved.playbackUrl === "string" ? saved.playbackUrl : undefined,
    sizeBytes: typeof saved.sizeBytes === "number" ? saved.sizeBytes : undefined,
    status: "saved",
    serverSaved: true,
  };
}

function countAnswered(answers: Answers, writing: WritingAnswers, recordings: RecordingState) {
  return Object.keys(answers).length + Object.values(writing).filter((value) => value.trim()).length + Object.values(recordings).filter((entry) => entry.status === "saved" && Boolean(entry.audioData || entry.storageKey)).length;
}

function catalogQuestionCount(content: VstepTest1Public, catalog: ExamCatalogCode) {
  if (catalog === "LISTENING") return content.listening.parts.reduce((sum, part) => sum + part.questions.length, 0);
  if (catalog === "READING") return content.reading.passages.reduce((sum, passage) => sum + passage.questions.length, 0);
  if (catalog === "WRITING") return content.writing.length;
  if (catalog === "SPEAKING") return content.speaking.parts.length;
  return 80;
}

function serializeRecordings(recordings: RecordingState): Record<string, SavedRecording> {
  return Object.fromEntries(Object.entries(recordings)
    .filter(([, entry]) => entry.status === "saved" && Boolean(entry.stoppedAt) && (Boolean(entry.storageKey) || (Boolean(entry.audioData) && Boolean(entry.serverSaved))))
    .map(([key, entry]) => [key, {
      startedAt: entry.startedAt,
      stoppedAt: entry.stoppedAt,
      durationSeconds: entry.durationSeconds,
      ...(entry.storageKey ? { storageKey: entry.storageKey, storageUrl: entry.storageUrl, playbackUrl: entry.playbackUrl, sizeBytes: entry.sizeBytes } : { audioData: entry.audioData }),
      mimeType: entry.mimeType || "audio/webm",
    }]));
}

function recordingExtension(mimeType: string) {
  const type = mimeType.split(";", 1)[0].toLowerCase();
  if (type === "audio/mp4" || type === "audio/m4a") return ".m4a";
  if (type === "audio/ogg") return ".ogg";
  if (type === "audio/wav" || type === "audio/x-wav") return ".wav";
  if (type === "audio/mpeg") return ".mp3";
  return ".webm";
}

async function blobFromAudioSource(source: string) {
  const response = await fetch(source);
  if (!response.ok) throw new Error("Không tải lại được bản ghi để thử lưu.");
  return response.blob();
}

function createRecorder(stream: MediaStream) {
  const preferredMime = "audio/webm;codecs=opus";
  if (typeof MediaRecorder.isTypeSupported === "function" && MediaRecorder.isTypeSupported(preferredMime)) return new MediaRecorder(stream, { mimeType: preferredMime });
  return new MediaRecorder(stream);
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Không thể đọc bản ghi âm."));
    reader.readAsDataURL(blob);
  });
}

type RenderExamPartProps = { exam: ExamFixture; content?: VstepTest1Public; skill: ExamSkill; activeUnit: unknown; answers: Answers; writingAnswers: WritingAnswers; recordings: RecordingState; bookmarks: Set<string>; activeRecording?: RecordingEntry; canAddToNotebook: boolean; audioRef: React.MutableRefObject<HTMLAudioElement | null>; setAudioStarted: (value: boolean) => void; onAnswer: (id: string, value: string) => void; onBookmark: (id: string) => void; onWriting: (id: string, value: string) => void; onStartRecording: () => Promise<boolean | undefined>; onStopRecording: () => Promise<void>; onEnableMicrophone: () => Promise<boolean>; onRetryRecording: () => Promise<void> };

function renderExamPart(props: RenderExamPartProps) {
  const { content, skill } = props;
  if (!content) return <GenericPart />;
  if (skill === "listening") return <ListeningPart content={content} unit={props.activeUnit as VstepListeningPartLike} answers={props.answers} bookmarks={props.bookmarks} canAddToNotebook={props.canAddToNotebook} onAnswer={props.onAnswer} onBookmark={props.onBookmark} audioRef={props.audioRef} setAudioStarted={props.setAudioStarted} />;
  if (skill === "reading") return <ReadingPart content={content} unit={props.activeUnit as VstepReadingPassageLike} answers={props.answers} bookmarks={props.bookmarks} canAddToNotebook={props.canAddToNotebook} onAnswer={props.onAnswer} onBookmark={props.onBookmark} />;
  if (skill === "writing") return <WritingPart unit={props.activeUnit as VstepWritingTaskLike} values={props.writingAnswers} onChange={props.onWriting} />;
  return <SpeakingSession key={getUnitId(props.activeUnit,"speaking")} unit={props.activeUnit as VstepSpeakingPartLike} recording={props.activeRecording} onStart={props.onStartRecording} onStop={props.onStopRecording} onEnableMicrophone={props.onEnableMicrophone} onRetrySave={props.onRetryRecording} />;
}

type VstepListeningPartLike = VstepTest1Public["listening"]["parts"][number];
type VstepReadingPassageLike = VstepTest1Public["reading"]["passages"][number];
type VstepWritingTaskLike = VstepTest1Public["writing"][number];
type VstepSpeakingPartLike = VstepTest1Public["speaking"]["parts"][number];

function getUnits(exam: ExamFixture, content: VstepTest1Public | undefined, skill: ExamSkill): ReadonlyArray<unknown> {
  if (content) {
    if (skill === "listening") return content.listening.parts;
    if (skill === "reading") return content.reading.passages;
    if (skill === "writing") return content.writing;
    return content.speaking.parts;
  }
  return [exam.parts.find((part) => part.skill === skill) ?? exam.parts[0]];
}

function ListeningPart({ content, unit, answers, bookmarks, canAddToNotebook, onAnswer, onBookmark, audioRef, setAudioStarted }: { content: VstepTest1Public; unit: VstepListeningPartLike; answers: Answers; bookmarks: Set<string>; canAddToNotebook: boolean; onAnswer: (id: string, value: string) => void; onBookmark: (id: string) => void; audioRef: React.MutableRefObject<HTMLAudioElement | null>; setAudioStarted: (value: boolean) => void }) {
  return <section className="mx-auto w-full max-w-[1160px]"><p className="text-sm italic leading-relaxed text-ink md:text-base">{content.listening.instructions}</p><div className="mt-5 rounded-2xl border border-[#DDE7F7] bg-white p-4 shadow-sm"><div className="flex items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-white"><Headphones className="size-4" aria-hidden="true" /></span><div className="min-w-0 flex-1"><p className="text-sm font-extrabold text-ink">{unit.title} · Đoạn nghe</p><p className="text-xs text-ink-muted">Nghe và chọn đáp án trong thời gian làm bài</p></div><span className="text-xs font-bold text-ink-muted">{formatTime(unit.durationSeconds)}</span></div><audio ref={audioRef} className="mt-3 w-full accent-brand" controls preload="metadata" src={unit.audioUrl} onPlay={() => setAudioStarted(true)} /></div><div className="mt-6"><p className="mb-1 text-xs font-extrabold uppercase tracking-[0.14em] text-brand">{unit.title}</p><p className="mb-5 text-sm text-ink-muted">{unit.instructions}</p><QuestionList questions={unit.questions} answers={answers} bookmarks={bookmarks} canAddToNotebook={canAddToNotebook} onAnswer={onAnswer} onBookmark={onBookmark} /></div></section>;
}

function ReadingPart({ content, unit, answers, bookmarks, canAddToNotebook, onAnswer, onBookmark }: { content: VstepTest1Public; unit: VstepReadingPassageLike; answers: Answers; bookmarks: Set<string>; canAddToNotebook: boolean; onAnswer: (id: string, value: string) => void; onBookmark: (id: string) => void }) {
  return <section className="grid min-h-[540px] gap-5 lg:grid-cols-[1.08fr_.92fr]"><article className="max-h-[calc(100vh-220px)] overflow-auto rounded-2xl border border-border bg-white p-5 text-sm leading-7 text-ink shadow-sm md:p-7"><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-brand">{unit.title}</p>{unit.text.split("\n\n").map((paragraph) => <p key={paragraph.slice(0, 24)} className="mt-4 first:mt-5">{paragraph}</p>)}</article><section className="max-h-[calc(100vh-220px)] overflow-auto rounded-2xl border border-border bg-white p-5 shadow-sm md:p-7"><p className="text-sm italic leading-relaxed text-ink">{content.reading.instructions}</p><div className="mt-6"><QuestionList questions={unit.questions} answers={answers} bookmarks={bookmarks} canAddToNotebook={canAddToNotebook} onAnswer={onAnswer} onBookmark={onBookmark} /></div></section></section>;
}

function WritingPart({ unit, values, onChange }: { unit: VstepWritingTaskLike; values: WritingAnswers; onChange: (id: string, value: string) => void }) {
  const value = values[unit.id] ?? "";
  return <section className="mx-auto w-full max-w-[1040px]"><p className="text-sm italic text-ink">You should spend about {unit.durationMinutes} minutes on this task.</p><div className="mt-5 rounded-2xl border-2 border-[#CCA26C] bg-[#FFFBF3] p-5 text-sm leading-relaxed text-ink md:p-6"><p className="font-extrabold">{unit.title}</p><p className="mt-3">{unit.prompt}</p>{unit.bullets?.length ? <ul className="mt-3 list-disc space-y-1 pl-5">{unit.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : null}<p className="mt-4">You should write at least {unit.minimumWords} words. Your response will be evaluated by the server after submission.</p></div><div className="mt-6 flex items-center justify-between gap-3 text-sm font-semibold text-ink"><label htmlFor={`writing-${unit.id}`}>Your answer:</label><p className="text-xs font-normal text-ink-muted">Word count: <b className="text-brand">{wordCount(value)}</b></p></div><textarea id={`writing-${unit.id}`} value={value} onChange={(event) => onChange(unit.id, event.target.value)} className="mt-2 min-h-[300px] w-full rounded-xl border border-border bg-white p-4 text-base leading-relaxed outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20" placeholder="Bắt đầu viết câu trả lời của bạn…" /></section>;
}

function QuestionList({ questions, answers, bookmarks, canAddToNotebook, onAnswer, onBookmark }: { questions: VstepQuestion[]; answers: Answers; bookmarks: Set<string>; canAddToNotebook: boolean; onAnswer: (id: string, value: string) => void; onBookmark: (id: string) => void }) {
  return <div className="space-y-7">{questions.map((question) => { const bookmarked = bookmarks.has(question.id); const selected = answers[question.id]; const selectedText = selected ? question.options[selected.charCodeAt(0) - 65] : ""; return <div key={question.id}><div className="flex items-start gap-2"><h3 className="min-w-0 flex-1 text-sm font-extrabold leading-relaxed text-ink md:text-base">Question {question.number}: {question.prompt}</h3><div className="flex shrink-0 items-center gap-1"><button type="button" onClick={() => onBookmark(question.id)} aria-label={bookmarked ? `Bỏ sao câu ${question.number}` : `Đánh dấu câu ${question.number}`} aria-pressed={bookmarked} className={`inline-flex size-11 items-center justify-center rounded-xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 ${bookmarked ? "border-[#CCA26C] bg-[#FFF7E5] text-[#A97621]" : "border-border text-ink-muted hover:border-brand hover:text-brand"}`}><Star className="size-5" fill={bookmarked ? "currentColor" : "none"} aria-hidden="true" /></button>{canAddToNotebook ? <PersonalVocabularyModal compact defaults={{ term: selectedText || question.prompt, meaningVi: selectedText || "", exampleEn: question.prompt, note: `Câu hỏi ${question.number}: ${question.prompt}` }} /> : null}</div></div><div className="mt-3 space-y-2">{question.options.map((option, index) => { const letter = String.fromCharCode(65 + index); const checked = answers[question.id] === letter; return <label key={`${question.id}-${letter}`} className={`flex min-h-11 cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 text-sm transition ${checked ? "border-brand bg-brand-soft text-ink" : "border-transparent hover:border-border"}`}><input type="radio" name={question.id} value={letter} checked={checked} onChange={() => onAnswer(question.id, letter)} className="mt-1 accent-brand" /><span><b className="mr-1">{letter}.</b>{option}</span></label>; })}</div></div>; })}</div>;
}

function GenericPart() {
  return <section className="mx-auto w-full max-w-[860px] rounded-2xl border border-border bg-white p-6 text-center shadow-sm md:p-10"><FileText className="mx-auto size-8 text-brand" aria-hidden="true" /><h2 className="mt-4 text-xl font-extrabold text-ink">Nội dung đang được cập nhật</h2><p className="mx-auto mt-2 max-w-[560px] text-sm leading-relaxed text-ink-muted">Bài luyện này chưa có dữ liệu câu hỏi. Vui lòng quay lại danh sách để chọn nội dung đã sẵn sàng.</p></section>;
}

type PreflightProps = { exam: ExamFixture; catalog: ExamCatalogCode; candidate?: ExamCandidate; audioSource?: string; audioChecked: boolean; audioStarted: boolean; audioRef: React.MutableRefObject<HTMLAudioElement | null>; microphoneState: PermissionState; errorMessage: string | null; starting: boolean; onPlayAudio: () => void; onReplayAudio: () => void; onStart: () => void };

function SkillStartScreen({ catalog, errorMessage, starting, onRetry }: { catalog: Exclude<ExamCatalogCode, "FULL">; errorMessage: string | null; starting: boolean; onRetry: () => void }) {
  const skillLabel = catalog[0] + catalog.slice(1).toLowerCase();
  return <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4"><div className="w-full max-w-md rounded-3xl border border-border bg-white p-8 text-center shadow-sm"><Image src="/brand/wewin-logo.png" alt="WEWIN EDUCATION" width={150} height={37} className="mx-auto h-9 w-auto" priority />{errorMessage ? <><div role="alert" className="mt-6 rounded-2xl border border-[#F0B7B0] bg-[#FFF7F5] px-4 py-3 text-left text-sm text-[#9B2C20]"><p>{errorMessage}</p></div><button type="button" onClick={onRetry} disabled={starting} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-btn)] bg-brand px-5 text-sm font-extrabold text-white disabled:opacity-50">{starting ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}Thử lại</button></> : <><LoaderCircle className="mx-auto mt-8 size-8 animate-spin text-brand" aria-hidden="true" /><p className="mt-4 text-sm font-extrabold text-ink">Đang mở bài luyện {skillLabel}…</p><p className="mt-1 text-xs text-ink-muted">Bài thi sẽ bắt đầu ngay khi máy chủ tạo lượt làm bài.</p></>}</div></div>;
}

function PreflightScreen({ exam, catalog, candidate, audioSource, audioChecked, audioStarted, audioRef, microphoneState, errorMessage, starting, onPlayAudio, onReplayAudio, onStart }: PreflightProps) {
  const content = exam.content;
  const name = candidate?.name?.trim() || candidate?.email?.trim() || "Tài khoản WEWIN";
  const email = candidate?.email?.trim() || "Tài khoản hiện tại";
  const audioReady = Boolean(audioSource) && audioChecked;
  const selectedPart = catalog === "FULL" ? null : exam.parts.find((part) => part.skill === catalog.toLowerCase());
  return <div className="min-h-screen bg-[#F8FAFC] px-4 py-5 md:px-8 md:py-7"><div className="mx-auto max-w-[1150px]"><div className="flex items-center justify-between gap-4"><Link href={`/exam/${exam.program}?catalog=${catalog}`} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand"><ArrowLeft className="size-4" aria-hidden="true" />Danh sách bài luyện</Link><Image src="/brand/wewin-logo.png" alt="WEWIN EDUCATION" width={150} height={37} className="h-9 w-auto" priority /></div><div className="mt-5 text-center"><p className="text-sm italic text-ink-muted">{catalog === "FULL" ? "Bài luyện theo thứ tự bốn kỹ năng: Nghe - Đọc - Viết - Nói." : `Kho ${selectedPart?.title ?? catalog.toLowerCase()} · một kỹ năng trong bộ đề.`}</p><div className="mx-auto mt-5 flex max-w-[560px] items-center gap-5 rounded-3xl border border-border bg-white p-4 text-left shadow-sm"><div className="flex size-28 shrink-0 items-center justify-center rounded-xl bg-brand-soft"><Image src="/brand/mascot-right-clear.png" alt="Mascot WEWIN" width={100} height={100} className="size-24 object-contain" /></div><div className="min-w-0 space-y-1 text-sm"><p>Họ tên: <b className="break-words">{name}</b></p><p>Tài khoản: <b className="break-all">{email}</b></p><p>Vai trò: <b>{candidate?.role === "ADMIN" ? "Quản trị viên" : candidate?.role === "LEARNER" ? "Học viên" : "Khách học thử"}</b></p><p className="flex items-center gap-1 text-xs text-ink-muted"><LockKeyhole className="size-3.5" aria-hidden="true" />Mã lượt thi sẽ do máy chủ cấp sau khi bắt đầu</p></div></div></div>{errorMessage ? <div role="alert" className="mx-auto mt-5 flex max-w-[760px] items-start gap-2 rounded-2xl border border-[#F0B7B0] bg-[#FFF7F5] px-4 py-3 text-left text-sm text-[#9B2C20]"><AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><p>{errorMessage}</p></div> : null}<div className="mt-8 grid gap-6 lg:grid-cols-3"><PreflightCard number="1" title="CẤU TRÚC BÀI LUYỆN">{selectedPart ? <><p>{selectedPart.title} – {selectedPart.duration}</p><p className="pt-2 text-xs text-ink-faint">{selectedPart.questions} câu trong kho này</p></> : <><p>Kỹ năng 1: NGHE – {exam.parts.find((part) => part.skill === "listening")?.duration ?? "47 phút"}</p><p>Kỹ năng 2: ĐỌC – {exam.parts.find((part) => part.skill === "reading")?.duration ?? "60 phút"}</p><p>Kỹ năng 3: VIẾT – {exam.parts.find((part) => part.skill === "writing")?.duration ?? "60 phút"}</p><p>Kỹ năng 4: NÓI – {exam.parts.find((part) => part.skill === "speaking")?.duration ?? "12 phút"}</p><p className="pt-2 text-xs text-ink-faint">{content ? "35 câu nghe · 40 câu đọc · 2 bài viết · 3 phần nói" : `${exam.questions} câu`}</p></>}</PreflightCard><PreflightCard number="2" title="KIỂM TRA AUDIO"><p>Nghe đoạn mẫu để kiểm tra thiết bị trước khi bắt đầu.</p>{audioSource ? <audio ref={audioRef} className="mt-4 w-full accent-brand" controls preload="metadata" src={audioSource} /> : <p className="mt-4 rounded-xl bg-surface px-4 py-3 text-sm text-ink-muted">Chưa có audio cho bài luyện này.</p>}<div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={onPlayAudio} disabled={!audioSource} className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-btn)] bg-brand px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"><Play className="size-4" aria-hidden="true" />Nghe thử</button><button type="button" onClick={onReplayAudio} disabled={!audioSource} className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-btn)] border border-brand px-4 py-2 text-sm font-bold text-brand transition hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-40"><RotateCcw className="size-4" aria-hidden="true" />Nghe lại</button></div><p className="mt-3 text-xs text-ink-muted">{audioStarted ? audioChecked ? "Đã kiểm tra audio." : "Audio đang phát." : "Bấm Nghe thử để kiểm tra."}</p></PreflightCard><PreflightCard number="3" title="LƯU Ý"><p>• Khi hết thời gian, hệ thống sẽ dừng phần đang làm.</p><p>• Bấm Tiếp tục để sang phần hoặc kỹ năng kế tiếp.</p><p>• Bài viết và bản ghi nói được gửi để máy chủ xử lý sau khi nộp.</p><div className="mt-4 rounded-xl border border-brand-soft bg-brand-soft/60 p-3 text-sm text-ink"><div className="flex items-center gap-2 font-bold text-brand"><ShieldCheck className="size-4" aria-hidden="true" />Quyền micro</div><p className="mt-1 text-xs leading-relaxed text-ink-muted">Bạn sẽ kiểm tra và cho phép micro khi vào phần Nói. Các phần Nghe, Đọc và Viết vẫn có thể làm trước.</p>{microphoneState === "granted" ? <p className="mt-2 text-xs font-bold text-[#1F7A4D]">Micro đã sẵn sàng.</p> : null}</div><hr className="my-4 border-border" /><button type="button" disabled={!audioReady || starting} onClick={onStart} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-btn)] bg-brand text-sm font-extrabold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40">{starting ? <><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />Đang tạo lượt thi…</> : <>Nhận đề <ArrowRight className="size-4" aria-hidden="true" /> </>}</button></PreflightCard></div></div></div>;
}

function PreflightCard({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return <section className="rounded-2xl p-1"><div className="mb-4 flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-full bg-brand text-lg font-extrabold text-white">{number}</span><h2 className="font-[family-name:var(--font-jakarta)] text-lg font-extrabold text-ink">{title}</h2></div><div className="space-y-3 text-sm leading-relaxed text-ink">{children}</div></section>;
}

type ExamBottomNavProps = { catalog: ExamCatalogCode; exam: ExamFixture; content?: VstepTest1Public; skillIndex: number; unitIndex: number; recordingBusy: boolean; onSkill: (index: number) => void; onUnit: (index: number) => void; onPrevious: () => void; onNext: () => void; onSave: () => void };

function ExamBottomNav({ catalog, exam, content, skillIndex, unitIndex, recordingBusy, onSkill, onUnit, onPrevious, onNext, onSave }: ExamBottomNavProps) {
  const units = getUnits(exam, content, exam.parts[skillIndex]?.skill ?? "listening");
  return <footer className="shrink-0 border-t border-border bg-white px-3 py-3 md:px-8"><div className="mx-auto flex max-w-[1260px] flex-wrap items-center gap-3"><div className="flex min-w-0 flex-1 flex-wrap gap-1">{catalog === "FULL" ? exam.parts.map((part, index) => <button key={part.id} type="button" onClick={() => onSkill(index)} aria-current={index === skillIndex ? "step" : undefined} disabled={recordingBusy} className={`min-h-11 shrink-0 rounded-xl px-3 text-xs font-extrabold transition ${index === skillIndex ? "bg-brand text-white" : "text-ink-muted hover:bg-brand-soft hover:text-brand"} disabled:cursor-not-allowed disabled:opacity-50`}>{index + 1}. {part.title}</button>) : <span className="inline-flex min-h-11 items-center rounded-xl bg-brand-soft px-3 text-xs font-extrabold text-brand">{exam.parts[skillIndex]?.title}</span>}</div><div className="ml-auto flex flex-wrap items-center gap-2"><label htmlFor="exam-unit" className="sr-only">Chọn phần</label><select id="exam-unit" value={Math.min(unitIndex, Math.max(units.length - 1, 0))} onChange={(event) => onUnit(Number(event.target.value))} disabled={recordingBusy} className="min-h-11 max-w-full rounded-xl border border-border bg-white px-2 text-xs font-semibold text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20">{units.map((unit, index) => <option key={getUnitId(unit, `unit-${index}`)} value={index}>{getUnitLabel(unit, index)}</option>)}</select><button type="button" onClick={onSave} disabled={recordingBusy} className="min-h-11 rounded-xl border border-border px-3 text-xs font-bold text-ink-muted transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-50">Lưu</button><button type="button" onClick={onPrevious} disabled={recordingBusy || (skillIndex === 0 && unitIndex === 0)} aria-label="Phần trước" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border text-ink transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"><ArrowLeft className="size-4" aria-hidden="true" /></button><button type="button" onClick={onNext} disabled={recordingBusy} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-brand px-4 text-xs font-extrabold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50">Tiếp tục <ArrowRight className="size-4" aria-hidden="true" /></button></div></div></footer>;
}

function getUnitLabel(unit: unknown, index: number) {
  if (unit && typeof unit === "object" && "title" in unit && typeof unit.title === "string") return unit.title;
  return `Phần ${index + 1}`;
}

function SubmitModal({ open, busy, hasPendingRecording, onClose, onSubmit }: { open: boolean; busy: boolean; hasPendingRecording: boolean; onClose: () => void; onSubmit: () => void }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0B1F3A]/50 p-4" role="presentation"><div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="submit-title"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-brand">Xác nhận</p><h2 id="submit-title" className="mt-1 text-xl font-extrabold text-ink">Nộp bài luyện?</h2></div><button type="button" onClick={onClose} disabled={busy} aria-label="Đóng" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-ink-muted hover:bg-surface disabled:opacity-40"><X className="size-5" aria-hidden="true" /></button></div><p className="mt-4 text-sm leading-relaxed text-ink-muted">Sau khi nộp, đáp án khách quan sẽ do máy chủ chấm. Bài viết và bản ghi nói chỉ hiển thị trạng thái khi dịch vụ chấm trả về dữ liệu.</p>{hasPendingRecording ? <p className="mt-3 rounded-xl bg-[#FFF7E5] px-3 py-2 text-xs font-semibold text-[#8A5B16]">Bản ghi đang được hoàn tất trước khi nộp.</p> : null}<div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} disabled={busy} className="min-h-11 rounded-[var(--radius-btn)] border border-border px-4 text-sm font-bold text-ink transition hover:border-brand hover:text-brand disabled:opacity-40">Tiếp tục làm</button><button type="button" onClick={onSubmit} disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-btn)] bg-brand px-5 text-sm font-extrabold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50">{busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}Nộp bài</button></div></div></div>;
}

function ResultScreen({ exam, result: initialResult, candidate, writingAnswers, recordings }: { exam: ExamFixture; result: SubmitResult; candidate?: ExamCandidate; writingAnswers: WritingAnswers; recordings: RecordingState }) {
  const [result,setResult]=useState(initialResult);
  const [gradingBusy,setGradingBusy]=useState(false);
  const [gradingError,setGradingError]=useState("");
  const [gradingStatus,setGradingStatus]=useState("");
  const autoGradeRef=useRef(false);
  useEffect(()=>{
    const id=initialResult.id ?? initialResult.attemptId;
    if(!id)return;
    let cancelled=false;
    void fetch(`/api/exams/attempts/${id}/review`).then(async response=>{
      if(!response.ok)throw new Error("Chưa tải được đáp án. Hãy tải lại trang.");
      const data=await response.json();
      if(!cancelled)setResult(current=>({...current,...data.grading,review:data.review}));
    }).catch(error=>{if(!cancelled)setGradingError(error.message);});
    return ()=>{cancelled=true;};
  },[initialResult.id,initialResult.attemptId]);
  async function requestGrading(){
    setGradingBusy(true);setGradingError("");
    try{
      const attemptId=result.id ?? result.attemptId;
      if(!attemptId)throw new Error("Không có mã lượt thi để chấm.");
      const response=await fetch(`/api/exams/attempts/${attemptId}/grade`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error || "Chưa chấm được bài. Hãy thử lại.");
      if(response.status===202){
        setGradingStatus(data.status || "QUEUED");
        for(let attempt=0;attempt<90;attempt+=1){
          await new Promise(resolve=>window.setTimeout(resolve,2000));
          const statusResponse=await fetch(`/api/exams/attempts/${attemptId}/grade`,{cache:"no-store"});
          const statusData=await statusResponse.json();
          if(!statusResponse.ok)throw new Error(statusData.error || "Không tải được trạng thái chấm.");
          setGradingStatus(statusData.status || "PROCESSING");
          if(statusData.workerUnavailable) setGradingError("Bản ghi đã được lưu nhưng máy chấm chưa hoạt động. Hãy bật worker Speaking rồi thử lại.");
          else if(statusData.status === "PROCESSING" || statusData.status === "GRADED") setGradingError("");
          if(statusData.status==="COMPLETED" || statusData.status==="GRADED"){
            setResult(current=>({...current,...statusData.grading}));
            break;
          }
          if(statusData.status==="PARTIAL"){
            setResult(current=>({...current,...statusData.grading}));
            break;
          }
          if(statusData.status==="FAILED")throw new Error(statusData.error || "Worker chấm Speaking thất bại.");
          if(attempt===89)throw new Error(statusData.workerUnavailable ? "Bản ghi đã được lưu nhưng máy chấm chưa hoạt động. Hãy thử lại sau khi worker Speaking được bật." : "Bài đang chấm lâu hơn dự kiến. Bạn có thể tải lại trang sau.");
        }
      }else{
        setGradingStatus("COMPLETED");
        setResult(current=>({...current,...data}));
      }
    }catch(error){setGradingError(error instanceof Error?error.message:"Chưa chấm được bài.");}
    finally{setGradingBusy(false);}
  }
  useEffect(()=>{
    if(autoGradeRef.current || !(initialResult.id ?? initialResult.attemptId))return;
    autoGradeRef.current=true;
    void requestGrading();
  // requestGrading is guarded by autoGradeRef so a result re-render cannot submit twice.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[initialResult.id,initialResult.attemptId]);
  const reviewItems = extractReviewItems(result);
  const name = candidate?.name?.trim() || candidate?.email?.trim() || "Tài khoản WEWIN";
  const account = candidate?.email?.trim() || "Tài khoản hiện tại";
  const attempt = result.id ?? result.attemptId ?? "—";
  return <div className="min-h-screen bg-[#F8FAFC] px-4 py-8 text-ink"><div className="mx-auto max-w-[1220px]"><header className="flex flex-wrap items-start justify-between gap-4"><div><Image src="/brand/wewin-logo.png" alt="WEWIN EDUCATION" width={150} height={37} className="h-9 w-auto" /><p className="mt-6 text-xs font-extrabold uppercase tracking-[0.15em] text-brand">BÁO CÁO KẾT QUẢ</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">Bài luyện đã được nộp</h1><p className="mt-2 text-sm text-ink-muted">Xem điểm, đáp án và những phần cần cải thiện.</p></div><div className="rounded-2xl border border-brand-soft bg-white px-4 py-3 text-sm"><p className="text-xs text-ink-muted">Mã lượt thi</p><p className="mt-1 break-all font-mono text-xs font-bold text-brand">{attempt}</p></div></header><div className="mt-7 grid gap-5 lg:grid-cols-[1.08fr_.72fr]"><section className="overflow-hidden rounded-3xl border border-brand-soft bg-white shadow-sm"><div className="border-t-4 border-brand bg-brand-soft/40 px-6 py-7 text-center md:px-10"><h2 className="text-2xl font-extrabold tracking-wide text-brand md:text-3xl">KẾT QUẢ {exam.program.toUpperCase()}</h2><p className="mt-2 text-sm text-ink-muted">Kết quả luyện tập, không thay thế chứng chỉ VSTEP</p><div className="mt-7 flex flex-wrap items-center justify-center gap-7"><div><p className="text-xs font-bold text-ink-muted">ĐIỂM TỔNG</p><p className="mt-1 text-5xl font-extrabold text-brand">{typeof result.overallScore === "number" ? result.overallScore : "—"}</p></div><div className="hidden h-14 w-px bg-brand-soft sm:block" /><div><p className="text-xs font-bold text-ink-muted">TRẠNG THÁI</p><p className="mt-1 text-2xl font-extrabold text-brand">Đã nộp</p></div></div></div><div className="px-6 py-7 md:px-10"><h3 className="flex items-center gap-2 text-xl font-extrabold"><BarChart3 className="size-5 text-brand" aria-hidden="true" />Điểm thành phần</h3><div className="mt-5 grid gap-3 sm:grid-cols-4"><ScoreCard label="Nghe" score={result.listening} /><ScoreCard label="Đọc" score={result.reading} /><ScoreCard label="Viết" score={typeof result.writingScore === "number" ? { score: result.writingScore } : undefined} /><ScoreCard label="Nói" score={typeof result.speakingScore === "number" ? { score: result.speakingScore } : undefined} /></div><div className="mt-7 flex flex-wrap justify-center gap-3 border-t border-border pt-6"><a href="#answer-review" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-brand px-6 text-sm font-extrabold text-brand transition hover:bg-brand-soft"><CheckCircle2 className="size-4" aria-hidden="true" />Xem dữ liệu đáp án</a><Link href={`/exam/${exam.program}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brand px-8 text-sm font-extrabold text-white shadow-sm transition hover:bg-brand-dark"><Send className="size-4" aria-hidden="true" />Làm bài khác</Link></div></div></section><aside className="space-y-5"><section className="rounded-3xl border border-border bg-white p-5 shadow-sm md:p-6"><h3 className="flex items-center gap-2 text-xl font-extrabold"><ShieldCheck className="size-5 text-brand" aria-hidden="true" />Thông tin thí sinh</h3><div className="mt-5 rounded-2xl bg-surface p-5"><div className="flex items-center gap-4"><span className="flex size-12 items-center justify-center rounded-full bg-brand text-white"><span className="text-lg font-extrabold">{name.slice(0, 1).toUpperCase()}</span></span><div className="min-w-0"><p className="break-words font-extrabold">{name}</p><span className="mt-1 block break-all text-xs text-ink-muted">{account}</span></div></div></div><InfoRow label="Vai trò" value={candidate?.role === "ADMIN" ? "Quản trị viên" : candidate?.role === "LEARNER" ? "Học viên" : "Khách học thử"} /><InfoRow label="Mã lượt thi" value={attempt} /></section><section className="rounded-3xl border border-brand-soft bg-brand-soft/40 p-5 md:p-6"><h3 className="flex items-center gap-2 text-xl font-extrabold"><Headphones className="size-5 text-brand" aria-hidden="true" />Bước tiếp theo</h3><p className="mt-4 text-sm leading-relaxed text-ink">Bạn có thể xem lại dữ liệu đã lưu bên dưới hoặc bắt đầu một bài luyện khác.</p></section></aside></div><section className="mt-5 rounded-3xl border border-brand-soft bg-white p-6"><h2 className="text-xl font-bold">Nhận xét Writing & Speaking</h2><p className="mt-2 text-sm text-ink-muted">Điểm luyện tập từ bài viết và bản ghi âm đã nộp. Khi gửi chấm, nội dung được chuyển tới OpenAI. Quá trình chấm có thể mất vài phút.</p><button type="button" onClick={()=>void requestGrading()} disabled={gradingBusy} className="mt-4 rounded-full bg-brand px-6 py-3 font-semibold text-white disabled:opacity-60">{gradingBusy?`Đang chấm ${gradingStatus ? `(${gradingStatus})` : ""}…`:"Chấm Writing & Speaking"}</button>{gradingError?<p role="alert" className="mt-3 text-sm text-red-700">{gradingError}</p>:null}<GradingFeedback value={result.writing}/><GradingFeedback value={result.speaking}/></section><ResultReview items={reviewItems} writingAnswers={writingAnswers} recordings={recordings} /></div></div>;
}

function ScoreCard({ label, score }: { label: string; score?: ScoreSummary }) {
  const hasScore = typeof score?.score === "number";
  const counts = typeof score?.correct === "number" && typeof score?.total === "number" ? `${score.correct}/${score.total} câu đúng` : "Máy chủ chưa trả dữ liệu";
  return <div className="rounded-2xl border border-border bg-surface p-4 text-center"><p className="text-sm font-bold text-ink">{label}</p><p className="mt-3 text-2xl font-extrabold text-brand">{hasScore ? score?.score : "—"}</p><p className="mt-1 text-[11px] text-ink-muted">{counts}</p></div>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="mt-4 flex items-start justify-between gap-4 border-b border-border pb-3 text-sm"><span className="text-ink-muted">{label}</span><b className="max-w-[65%] break-all text-right text-ink">{value}</b></div>;
}

function ResultReview({ items, writingAnswers, recordings }: { content?: VstepTest1Public; items: ReviewItem[]; writingAnswers: WritingAnswers; recordings: RecordingState }) {
  const savedWriting = Object.entries(writingAnswers).filter(([, value]) => value.trim());
  const savedRecordings = Object.entries(recordings).filter(([, entry]) => entry.status === "saved" && entry.audioData);
  return <section id="answer-review" className="mt-5 grid gap-5 lg:grid-cols-[1fr_.85fr]"><section className="rounded-3xl border border-border bg-white p-5 shadow-sm md:p-7"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-brand">Review</p><h2 className="mt-1 text-xl font-extrabold">Đáp án và giải thích</h2></div><Check className="size-5 text-brand" aria-hidden="true" /></div>{items.length ? <div className="mt-5 space-y-4">{items.map((item, index) => <ReviewRow key={`${item.id ?? item.questionId ?? "review"}-${index}`} item={item} index={index} />)}</div> : <div className="mt-5 rounded-2xl bg-surface p-4 text-sm leading-relaxed text-ink-muted"><p>Chưa tải được đáp án của lượt thi này.</p><p className="mt-2">Hãy tải lại để xem đáp án đã lưu.</p></div>}</section><section className="space-y-5"><section className="rounded-3xl border border-border bg-white p-5 shadow-sm md:p-7"><div className="flex items-center gap-2"><FileText className="size-5 text-brand" aria-hidden="true" /><h2 className="text-xl font-extrabold">Bài viết đã lưu</h2></div>{savedWriting.length ? <div className="mt-5 space-y-4">{savedWriting.map(([id, value]) => <article key={id} className="rounded-2xl bg-surface p-4"><p className="text-xs font-extrabold uppercase tracking-wide text-brand">{id}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">{value}</p></article>)}</div> : <p className="mt-4 text-sm leading-relaxed text-ink-muted">Không có bài viết được lưu trong lượt này.</p>}</section><section className="rounded-3xl border border-border bg-white p-5 shadow-sm md:p-7"><div className="flex items-center gap-2"><Mic className="size-5 text-brand" aria-hidden="true" /><h2 className="text-xl font-extrabold">Bản ghi nói đã lưu</h2></div>{savedRecordings.length ? <div className="mt-5 space-y-4">{savedRecordings.map(([id, entry]) => <div key={id} className="rounded-2xl bg-surface p-4"><p className="text-xs font-extrabold uppercase tracking-wide text-brand">{id}</p><audio className="mt-3 w-full" controls preload="metadata" src={entry.audioData} /><p className="mt-2 text-xs text-ink-muted">Thời lượng: {entry.durationSeconds}s</p></div>)}</div> : <p className="mt-4 text-sm leading-relaxed text-ink-muted">Không có bản ghi được lưu trong lượt này.</p>}</section></section></section>;
}

function ReviewRow({ item, index }: { item: ReviewItem; index: number }) {
  const selected = item.selectedAnswer ?? item.answer ?? "Chưa trả lời";
  const correct = item.correctAnswer ?? "Máy chủ chưa trả đáp án";
  return <article className="rounded-2xl border border-border p-4"><div className="flex items-start gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-extrabold text-brand">{index + 1}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-extrabold text-ink">{item.prompt || item.questionId || item.id || "Câu hỏi"}</p><div className="flex items-center gap-2">{item.bookmarked ? <Star className="size-4 text-[#A97621]" fill="currentColor" aria-label="Đã lưu sao" /> : null}{typeof item.isCorrect === "boolean" ? <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${item.isCorrect ? "bg-[#ECFBF3] text-[#1F7A4D]" : "bg-[#FFF0EE] text-[#A62B20]"}`}>{item.isCorrect ? "Đúng" : "Chưa đúng"}</span> : null}</div></div><div className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><p className="rounded-xl bg-surface px-3 py-2"><span className="block text-xs text-ink-muted">Bạn chọn</span><b className="break-words">{String(selected)}</b></p><p className="rounded-xl bg-brand-soft px-3 py-2"><span className="block text-xs text-ink-muted">Đáp án đúng</span><b className="break-words text-brand">{String(correct)}</b></p></div>{item.passage?<details className="mt-2 text-xs"><summary className="cursor-pointer font-semibold text-brand">Mở đoạn đọc liên quan</summary><p className="mt-2 whitespace-pre-wrap leading-relaxed text-ink-muted">{item.passage}</p></details>:null}</div></div></article>;
}

function extractReviewItems(result: SubmitResult): ReviewItem[] {
  const candidates = [result.review, readNested(result.answers, "review"), readNested(result.grading, "review")];
  for (const candidate of candidates) {
    const items = normalizeReview(candidate);
    if (items.length) return items;
  }
  return [];
}

function readNested(value: unknown, key: string): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return key in value ? (value as Record<string, unknown>)[key] : undefined;
}

function normalizeReview(value: unknown): ReviewItem[] {
  if (Array.isArray(value)) return value.filter(isReviewItem).map((item) => item);
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, item]) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    if (!isReviewItem(item)) return [];
    return [{ ...item, id: item.id ?? key, questionId: item.questionId ?? key }];
  });
}

function isReviewItem(value: unknown): value is ReviewItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return ["prompt", "questionId", "id", "correctAnswer", "answer", "selectedAnswer", "isCorrect"].some((key) => key in item);
}

function wordCount(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}
function GradingFeedback({value}:{value:unknown}){
  if(!Array.isArray(value))return null;
  return <div className="mt-5 space-y-4">{value.map((raw,index)=>{
    const report=raw as Record<string,unknown>;
    const feedback=(report.direct_feedback_vi || {}) as Record<string,unknown>;
    const criteria=(report.scores || {}) as Record<string,{score:unknown;evidence:string}>;
    const labels:Record<string,string>={task_fulfillment:"Đáp ứng đề",organization:"Tổ chức bài",vocabulary:"Từ vựng",grammar:"Ngữ pháp",fluency_coherence:"Độ trôi chảy",pronunciation:"Phát âm"};
    const examinerReports=Array.isArray(report.examiner_reports)?report.examiner_reports as Record<string,unknown>[]:[];
    return <article key={String(report.id||index)} className="rounded-2xl bg-surface p-5"><h3 className="font-bold text-brand">{String(report.task_type||report.part||report.id)} · {typeof report.task_score==="number"?report.task_score:"Chưa đủ bằng chứng"}/10</h3><p className="mt-2 text-sm">{String(feedback.current_reality||"")}</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{Object.entries(criteria).map(([key,criterion])=><div key={key} className="rounded-xl bg-white p-3 text-sm"><b>{labels[key]||key}: {typeof criterion.score==="number"?criterion.score:"—"}</b><p className="mt-1 text-ink-muted">{criterion.evidence}</p></div>)}</div><p className="mt-3 text-sm"><b>Ưu tiên cải thiện:</b> {String(feedback.highest_priority_fix||"")}</p>{typeof report.transcript==="string"?<details className="mt-3 text-sm"><summary className="cursor-pointer font-semibold">Bản chép lời</summary><p className="mt-2 whitespace-pre-wrap">{report.transcript}</p></details>:null}<details className="mt-3 text-sm"><summary className="cursor-pointer font-semibold">Dẫn chứng và sửa lỗi từ các lượt chấm</summary>{examinerReports.map((examiner,i)=><div key={i} className="mt-3"><b>Lượt {String(examiner.examiner_id||i+1)}</b>{["errors","grammar_errors","pronunciation_issues","vocabulary_issues"].flatMap(key=>Array.isArray(examiner[key])?(examiner[key] as Record<string,unknown>[]).map((error,j)=><p key={key+j} className="mt-2 rounded-lg bg-white p-3">{String(error.original||error.spoken_form||error.word_or_phrase||"")} → {String(error.correction||error.better_form||error.better_expression||error.issue||"")}<span className="mt-1 block text-ink-muted">{String(error.explanation_vi||error.suggestion_vi||"")}</span></p>):[])}</div>)}</details></article>;
  })}</div>;
}
