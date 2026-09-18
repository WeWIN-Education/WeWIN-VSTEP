"use client";

import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronRight,
  FileText,
  Info,
  Loader2,
  Music2,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";

const MAX_DOCX_SIZE = 20 * 1024 * 1024;
const MAX_AUDIO_SIZE = 25 * 1024 * 1024;
const MAX_AUDIO_TOTAL = 100 * 1024 * 1024;
const AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".m4a", ".mp4", ".ogg", ".webm"]);

type PreviewQuestion = { id?: string; number?: number };
type PreviewListeningPart = { id?: string; title?: string; audioUrl?: string; questions?: PreviewQuestion[] };
type PreviewPassage = { id?: string; title?: string; questions?: PreviewQuestion[] };
type PreviewWriting = { id?: string; title?: string; prompt?: string };
type PreviewSpeaking = { id?: string; title?: string; prompt?: string; audioUrl?: string };

type PreviewPaper = {
  slug?: string;
  title?: string;
  subtitle?: string;
  target?: string;
  durationMinutes?: number;
  questionCount?: number;
  listening?: { parts?: PreviewListeningPart[] };
  reading?: { passages?: PreviewPassage[] };
  writing?: PreviewWriting[];
  speaking?: { parts?: PreviewSpeaking[] };
};

type PreviewResponse = {
  valid?: boolean;
  paper?: PreviewPaper;
  requiredAudio?: string[];
  missingAudio?: string[];
  unusedAudio?: string[];
  warnings?: string[];
  error?: string;
  errors?: string[];
};

type PublishedResponse = PreviewResponse & {
  published?: boolean;
  id?: string;
  slug?: string;
  url?: string;
};

type Action = "preview" | "publish";

function formatBytes(value: number) {
  if (value === 0) return "0 B";
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(value >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

function extensionOf(name: string) {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

function normaliseResponse(value: unknown): PreviewResponse {
  if (!value || typeof value !== "object") return { error: "Máy chủ trả về dữ liệu không hợp lệ." };
  return value as PreviewResponse;
}

function firstError(body: PreviewResponse) {
  return body.error || body.errors?.filter(Boolean).join(" ") || "Không thể kiểm tra đề.";
}

function questionCount(items: Array<{ questions?: PreviewQuestion[] }> | undefined) {
  return items?.reduce((total, item) => total + (item.questions?.length ?? 0), 0) ?? 0;
}

export function ExamImportForm() {
  const docxInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [docx, setDocx] = useState<File | null>(null);
  const [audioFiles, setAudioFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [published, setPublished] = useState<PublishedResponse | null>(null);
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState<Action | null>(null);

  const audioTotal = useMemo(() => audioFiles.reduce((total, file) => total + file.size, 0), [audioFiles]);
  const canPublish = preview?.valid === true && !preview.missingAudio?.length;

  function clearPreview() {
    setPreview(null);
    setPublished(null);
    setError("");
  }

  function chooseDocx(file: File | undefined) {
    if (!file) return;
    clearPreview();
    if (extensionOf(file.name) !== ".docx") {
      setDocx(null);
      setError("Chỉ hỗ trợ file DOCX. Nếu dùng Google Docs, hãy tải xuống bằng định dạng Microsoft Word (.docx).");
      return;
    }
    if (file.size > MAX_DOCX_SIZE) {
      setDocx(null);
      setError("File DOCX vượt quá giới hạn 20 MB.");
      return;
    }
    setDocx(file);
  }

  function addAudio(files: FileList | null) {
    if (!files?.length) return;
    clearPreview();
    const selected = Array.from(files);
    const currentNames = new Set(audioFiles.map((file) => file.name.toLocaleLowerCase()));
    const next = [...audioFiles];
    const invalid: string[] = [];
    let nextTotal = audioTotal;

    for (const file of selected) {
      const extension = extensionOf(file.name);
      if (!AUDIO_EXTENSIONS.has(extension)) {
        invalid.push(`${file.name}: chỉ nhận MP3, WAV, M4A, MP4, OGG hoặc WEBM.`);
        continue;
      }
      if (file.size > MAX_AUDIO_SIZE) {
        invalid.push(`${file.name}: vượt quá giới hạn 25 MB.`);
        continue;
      }
      if (currentNames.has(file.name.toLocaleLowerCase())) {
        invalid.push(`${file.name}: tên file bị trùng.`);
        continue;
      }
      if (nextTotal + file.size > MAX_AUDIO_TOTAL) {
        invalid.push(`${file.name}: thêm file này sẽ vượt tổng giới hạn 100 MB.`);
        continue;
      }
      currentNames.add(file.name.toLocaleLowerCase());
      next.push(file);
      nextTotal += file.size;
    }

    setAudioFiles(next);
    if (invalid.length) setError(invalid.join(" "));
  }

  function removeAudio(index: number) {
    clearPreview();
    setAudioFiles((files) => files.filter((_, fileIndex) => fileIndex !== index));
  }

  async function submit(action: Action) {
    if (!docx) {
      setError("Hãy chọn file DOCX trước khi tiếp tục.");
      return;
    }
    if (action === "publish" && !canPublish) {
      setError("Hãy xem trước và sửa toàn bộ lỗi trước khi xuất bản.");
      return;
    }
    setError("");
    setPublished(null);
    setPendingAction(action);
    try {
      const form = new FormData();
      form.append("docx", docx);
      audioFiles.forEach((file) => form.append("audio", file));
      form.append("mode", action);
      const response = await fetch("/api/manage/exams/import", { method: "POST", body: form });
      const body = normaliseResponse(await response.json().catch(() => null));
      if (!response.ok) {
        if (action === "preview") {
          setPreview({
            ...body,
            valid: false,
            errors: body.errors?.length ? body.errors : body.error ? [body.error] : ["Không thể đọc bản DOCX."],
          });
        }
        throw new Error(firstError(body));
      }
      if (action === "preview") {
        setPreview(body);
        if (body.valid !== true) setError("Bản nháp chưa đủ điều kiện xuất bản. Xem các lỗi và bổ sung nội dung trong DOCX.");
      } else {
        setPublished(body as PublishedResponse);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể gửi file.");
    } finally {
      setPendingAction(null);
    }
  }

  const paper = preview?.paper;
  const listeningParts = paper?.listening?.parts ?? [];
  const readingPassages = paper?.reading?.passages ?? [];
  const writingTasks = paper?.writing ?? [];
  const speakingParts = paper?.speaking?.parts ?? [];
  const previewHasErrors = preview && preview.valid !== true;

  return (
    <section className="space-y-5" aria-label="Nhập đề VSTEP" aria-busy={pendingAction !== null}>
      <div className="grid gap-5 xl:grid-cols-[1.03fr_.97fr]">
        <div className="rounded-[24px] border border-border bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-brand">Bước 1</p>
              <h2 className="mt-1 font-[family-name:var(--font-jakarta)] text-xl font-extrabold text-ink">Chọn đề và audio</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">
                Tải DOCX đã điền theo mẫu, sau đó chọn tất cả audio được tham chiếu trong đề. Hệ thống sẽ đối chiếu tên file trước khi ghi dữ liệu.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-xs font-bold text-brand">
              <Info className="size-3.5" /> Xem trước trước khi xuất bản
            </span>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label htmlFor="vstep-docx" className="text-sm font-extrabold text-ink">File đề DOCX <span className="text-red-600">*</span></label>
                <span className="text-xs text-ink-muted">Tối đa 20 MB</span>
              </div>
              <input
                ref={docxInputRef}
                id="vstep-docx"
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="sr-only"
                onChange={(event) => chooseDocx(event.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => docxInputRef.current?.click()}
                disabled={pendingAction !== null}
                aria-describedby="vstep-docx-help"
                className="group flex min-h-[108px] w-full items-center gap-4 rounded-2xl border-2 border-dashed border-brand/30 bg-brand-soft/35 px-4 text-left transition hover:border-brand hover:bg-brand-soft/60 focus-visible:border-brand disabled:cursor-wait disabled:opacity-60 sm:px-5"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white text-brand shadow-sm ring-1 ring-brand/10">
                  <FileText className="size-6" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-extrabold text-ink">{docx?.name ?? "Chọn file .docx"}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-ink-muted">
                    {docx ? `${formatBytes(docx.size)} · đã sẵn sàng kiểm tra` : "Word hoặc Google Docs xuất thành Microsoft Word (.docx)"}
                  </span>
                </span>
                <Upload className="ml-auto size-5 shrink-0 text-brand/70 transition group-hover:text-brand" />
              </button>
              <p id="vstep-docx-help" className="sr-only">File DOCX bắt buộc, tối đa 20 MB.</p>
            </div>

            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <label htmlFor="vstep-audio" className="text-sm font-extrabold text-ink">Audio tham chiếu <span className="font-medium text-ink-muted">(nếu có)</span></label>
                <span className="text-xs text-ink-muted">Mỗi file 25 MB · tổng 100 MB</span>
              </div>
              <input
                ref={audioInputRef}
                id="vstep-audio"
                type="file"
                accept=".mp3,.wav,.m4a,.mp4,.ogg,.webm,audio/*"
                multiple
                className="sr-only"
                onChange={(event) => {
                  addAudio(event.target.files);
                  event.currentTarget.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => audioInputRef.current?.click()}
                disabled={pendingAction !== null}
                className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 text-left transition hover:border-brand hover:bg-white focus-visible:border-brand disabled:cursor-wait disabled:opacity-60"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand ring-1 ring-border"><Music2 className="size-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-ink">{audioFiles.length ? `Đã chọn ${audioFiles.length} file audio` : "Chọn một hoặc nhiều file audio"}</span>
                  <span className="mt-0.5 block text-xs text-ink-muted">MP3, WAV, M4A, MP4, OGG hoặc WEBM · {formatBytes(audioTotal)} / 100 MB</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-ink-faint" />
              </button>
              {audioFiles.length ? (
                <ul className="mt-3 space-y-2" aria-label="Danh sách audio đã chọn">
                  {audioFiles.map((file, index) => (
                    <li key={`${file.name}-${file.lastModified}`} className="flex items-center gap-3 rounded-xl border border-border/80 bg-white px-3 py-2.5">
                      <Music2 className="size-4 shrink-0 text-brand" />
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-ink">{file.name}</span><span className="text-xs text-ink-muted">{formatBytes(file.size)}</span></span>
                      <button type="button" onClick={() => removeAudio(index)} disabled={pendingAction !== null} aria-label={`Xóa ${file.name}`} className="rounded-lg p-1.5 text-ink-faint transition hover:bg-red-50 hover:text-red-600 disabled:cursor-wait disabled:opacity-50"><Trash2 className="size-4" /></button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>

          {error ? (
            <div role="alert" aria-live="assertive" className="mt-5 flex gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <p className="leading-relaxed">{error}</p>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => void submit("preview")} disabled={pendingAction !== null || !docx} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-btn)] bg-brand px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50">
              {pendingAction === "preview" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              {pendingAction === "preview" ? "Đang kiểm tra…" : "Xem trước và kiểm tra"}
            </button>
            <button type="button" onClick={() => void submit("publish")} disabled={pendingAction !== null || !canPublish} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-btn)] border border-brand/20 bg-white px-5 text-sm font-extrabold text-brand transition hover:border-brand hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-40">
              {pendingAction === "publish" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              {pendingAction === "publish" ? "Đang xuất bản…" : "Xuất bản đề"}
            </button>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-ink-muted">Nút xuất bản chỉ bật sau khi bản xem trước hợp lệ, đủ 35 câu Nghe, 40 câu Đọc, 2 bài Viết, 3 phần Nói và đủ audio được khai báo.</p>
        </div>

        <div className="rounded-[24px] border border-border bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand-soft text-brand"><CheckCircle2 className="size-5" /></span>
            <div><p className="text-xs font-extrabold uppercase tracking-[0.12em] text-brand">Bước 2</p><h2 className="mt-0.5 font-[family-name:var(--font-jakarta)] text-xl font-extrabold text-ink">Kiểm tra cấu trúc</h2></div>
          </div>
          {!preview ? (
            <div className="mt-6 flex min-h-[290px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface px-5 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-white text-ink-faint shadow-sm"><FileText className="size-7" /></span>
              <p className="mt-4 text-sm font-extrabold text-ink">Chưa có bản xem trước</p>
              <p className="mt-1 max-w-xs text-xs leading-relaxed text-ink-muted">Chọn DOCX rồi bấm “Xem trước và kiểm tra” để xem số lượng câu, audio thiếu và cảnh báo nội dung.</p>
            </div>
          ) : (
            <div className="mt-5 space-y-4" aria-live="polite">
              <div className={`flex gap-3 rounded-2xl border px-4 py-3 ${previewHasErrors ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`} role="status" aria-live="polite">
                {previewHasErrors ? <AlertCircle className="mt-0.5 size-5 shrink-0" /> : <CheckCircle2 className="mt-0.5 size-5 shrink-0" />}
                <div className="min-w-0"><p className="text-sm font-extrabold">{previewHasErrors ? "Chưa thể xuất bản" : "Đề hợp lệ để xuất bản"}</p><p className="mt-0.5 text-xs leading-relaxed">{previewHasErrors ? "Sửa lỗi trong DOCX, thay file rồi xem trước lại." : "Cấu trúc và nội dung bắt buộc đã vượt qua kiểm tra."}</p></div>
              </div>
              {preview.errors?.length ? <IssueList title="Lỗi cần sửa trong DOCX" items={preview.errors} tone="danger" /> : null}
              {paper ? <>
                <div className="rounded-2xl border border-border bg-surface px-4 py-3"><p className="truncate text-base font-extrabold text-ink">{paper.title || "Đề chưa có tiêu đề"}</p><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-muted"><span>slug: <b className="text-ink">{paper.slug || "—"}</b></span><span>{paper.target || "B1–C1"}</span><span>{paper.durationMinutes || 0} phút</span></div></div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Metric label="Listening" value={questionCount(listeningParts)} detail="35 câu" ok={questionCount(listeningParts) === 35} />
                  <Metric label="Reading" value={questionCount(readingPassages)} detail="40 câu" ok={questionCount(readingPassages) === 40} />
                  <Metric label="Writing" value={writingTasks.length} detail="2 bài" ok={writingTasks.length === 2} />
                  <Metric label="Speaking" value={speakingParts.length} detail="3 phần" ok={speakingParts.length === 3} />
                </div>
                <div className="space-y-2 text-sm">
                  <PreviewRow icon={<Music2 className="size-4" />} label="Audio được khai báo" value={`${preview.requiredAudio?.length ?? 0} file`} />
                  <PreviewRow icon={<AlertCircle className="size-4" />} label="Audio còn thiếu" value={`${preview.missingAudio?.length ?? 0} file`} tone={preview.missingAudio?.length ? "danger" : "default"} />
                  <PreviewRow icon={<Info className="size-4" />} label="Audio chưa dùng" value={`${preview.unusedAudio?.length ?? 0} file`} tone={preview.unusedAudio?.length ? "warning" : "default"} />
                </div>
                {preview.missingAudio?.length ? <IssueList title="Cần bổ sung audio" items={preview.missingAudio} tone="danger" /> : null}
                {preview.unusedAudio?.length ? <IssueList title="Audio đã chọn nhưng chưa được dùng" items={preview.unusedAudio} tone="warning" /> : null}
                {preview.warnings?.length ? <IssueList title="Cảnh báo cần xem lại" items={preview.warnings} tone="warning" /> : null}
              </> : null}
            </div>
          )}
        </div>
      </div>

      {published?.published ? (
        <div className="flex flex-wrap items-center gap-3 rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-800 shadow-sm">
          <CheckCircle2 className="size-5 shrink-0" />
          <div className="min-w-0 flex-1"><p className="text-sm font-extrabold">Đã xuất bản đề thành công</p><p className="mt-0.5 text-xs">Đề đã sẵn sàng cho học viên trên hệ thống.</p></div>
          {published.url ? <a href={published.url} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-emerald-700 px-4 text-sm font-extrabold text-white hover:bg-emerald-800">Mở đề <ChevronRight className="size-4" /></a> : null}
        </div>
      ) : null}
    </section>
  );
}

function Metric({ label, value, detail, ok }: { label: string; value: number; detail: string; ok: boolean }) {
  return <div className={`rounded-2xl border px-3 py-3 ${ok ? "border-emerald-100 bg-emerald-50/70" : "border-border bg-white"}`}><p className="text-[11px] font-extrabold uppercase tracking-wide text-ink-muted">{label}</p><p className="mt-1 text-xl font-extrabold text-ink">{value}</p><p className={`text-[11px] font-semibold ${ok ? "text-emerald-700" : "text-ink-muted"}`}>{ok ? "Đủ " : "Mục tiêu "}{detail}</p></div>;
}

function PreviewRow({ icon, label, value, tone = "default" }: { icon: ReactNode; label: string; value: string; tone?: "default" | "danger" | "warning" }) {
  const valueClass = tone === "danger" ? "text-red-700" : tone === "warning" ? "text-amber-700" : "text-ink";
  return <div className="flex items-center gap-3 rounded-xl border border-border/70 px-3 py-2.5"><span className="text-brand">{icon}</span><span className="flex-1 text-ink-muted">{label}</span><b className={`text-xs ${valueClass}`}>{value}</b></div>;
}

function IssueList({ title, items, tone }: { title: string; items: string[]; tone: "danger" | "warning" }) {
  return <div className={`rounded-2xl border px-3.5 py-3 ${tone === "danger" ? "border-red-100 bg-red-50/70" : "border-amber-100 bg-amber-50/70"}`}><p className={`text-xs font-extrabold ${tone === "danger" ? "text-red-800" : "text-amber-800"}`}>{title}</p><ul className={`mt-2 max-h-28 space-y-1 overflow-y-auto text-xs leading-relaxed ${tone === "danger" ? "text-red-700" : "text-amber-700"}`}>{items.map((item, index) => <li key={`${item}-${index}`} className="flex gap-1.5"><span aria-hidden="true">·</span><span className="break-words">{item}</span></li>)}</ul></div>;
}
