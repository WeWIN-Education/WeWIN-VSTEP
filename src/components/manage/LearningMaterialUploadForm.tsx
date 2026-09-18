"use client";

import { upload as uploadBlob } from "@vercel/blob/client";
import { AlertCircle, CheckCircle2, Download, FileText, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { fileExtension, formatFileSize, MATERIAL_FILE_TYPES, materialLevelLabel, materialSkillLabel, type MaterialLevel, type MaterialSkill } from "@/lib/learning-materials";

export type LearningMaterialSummary = {
  id: string;
  title: string;
  description: string | null;
  programme: string;
  skill: string;
  level: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  published: boolean;
  createdAt: string;
};

const acceptedFiles = Object.keys(MATERIAL_FILE_TYPES).join(",");

export function LearningMaterialUploadForm({ initialMaterials }: { initialMaterials: LearningMaterialSummary[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [materials, setMaterials] = useState(initialMaterials);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skill, setSkill] = useState<MaterialSkill>("GENERAL");
  const [level, setLevel] = useState<MaterialLevel>("ALL");
  const [published, setPublished] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function chooseFile(nextFile: File | undefined) {
    if (!nextFile) return;
    setFile(nextFile);
    setError("");
    setSuccess("");
    if (!title.trim()) {
      const extension = fileExtension(nextFile.name);
      setTitle(nextFile.name.slice(0, Math.max(0, nextFile.name.length - extension.length)));
    }
  }

  async function submit() {
    if (!file) {
      setError("Vui lòng chọn file tài liệu.");
      return;
    }
    if (!title.trim()) {
      setError("Vui lòng nhập tên tài liệu.");
      return;
    }

    setPending(true);
    setError("");
    setSuccess("");
    try {
      const capabilityResponse = await fetch("/api/manage/materials/upload", { cache: "no-store" });
      const capabilities = await capabilityResponse.json().catch(() => ({})) as { directUpload?: boolean; error?: string };
      if (!capabilityResponse.ok) throw new Error(capabilities.error || "Không kiểm tra được nơi lưu tài liệu.");

      let response: Response;
      if (capabilities.directUpload) {
        const extension = fileExtension(file.name);
        const contentType = file.type || MATERIAL_FILE_TYPES[extension as keyof typeof MATERIAL_FILE_TYPES] || "application/octet-stream";
        const pathname = `materials/${crypto.randomUUID()}${extension}`;
        const uploaded = await uploadBlob(pathname, file, {
          access: "private",
          contentType,
          multipart: file.size > 5 * 1024 * 1024,
          handleUploadUrl: "/api/manage/materials/upload",
          clientPayload: JSON.stringify({ fileName: file.name }),
        });
        response = await fetch("/api/manage/materials/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pathname: uploaded.pathname, url: uploaded.url, fileName: file.name, title, description, skill, level, published }),
        });
      } else {
        const body = new FormData();
        body.append("file", file);
        body.append("title", title);
        body.append("description", description);
        body.append("skill", skill);
        body.append("level", level);
        body.append("published", String(published));
        response = await fetch("/api/manage/materials", { method: "POST", body });
      }
      const data = await response.json() as { material?: LearningMaterialSummary; error?: string };
      if (!response.ok || !data.material) throw new Error(data.error || "Không thể tải tài liệu lên.");
      setMaterials((current) => [data.material!, ...current]);
      setFile(null);
      setTitle("");
      setDescription("");
      setSkill("GENERAL");
      setLevel("ALL");
      setPublished(true);
      if (inputRef.current) inputRef.current.value = "";
      setSuccess("Tài liệu đã được tải lên thành công.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể tải tài liệu lên.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="space-y-6" aria-busy={pending}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-[24px] border border-border bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand"><Upload className="size-5" /></span>
            <div><h2 className="font-[family-name:var(--font-jakarta)] text-lg font-extrabold text-ink">Tải tài liệu mới</h2><p className="mt-1 text-sm leading-relaxed text-ink-muted">Hỗ trợ PDF, Word, PowerPoint, Excel, ảnh, audio và video. Mỗi file tối đa 50 MB.</p></div>
          </div>
          <div className="mt-5 space-y-4">
            <div>
              <label htmlFor="material-title" className="text-sm font-extrabold text-ink">Tên tài liệu</label>
              <input id="material-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} placeholder="Ví dụ: Reading B1 - Dạng bài điền từ" className="mt-2 h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" />
            </div>
            <div>
              <label htmlFor="material-description" className="text-sm font-extrabold text-ink">Mô tả <span className="font-normal text-ink-muted">(không bắt buộc)</span></label>
              <textarea id="material-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} rows={3} placeholder="Nội dung và mục tiêu của tài liệu" className="mt-2 w-full resize-y rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label htmlFor="material-skill" className="text-sm font-extrabold text-ink">Kỹ năng</label><select id="material-skill" value={skill} onChange={(event) => setSkill(event.target.value as MaterialSkill)} className="mt-2 h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus:border-brand"><option value="GENERAL">Chung</option><option value="LISTENING">Listening</option><option value="READING">Reading</option><option value="WRITING">Writing</option><option value="SPEAKING">Speaking</option></select></div>
              <div><label htmlFor="material-level" className="text-sm font-extrabold text-ink">Trình độ</label><select id="material-level" value={level} onChange={(event) => setLevel(event.target.value as MaterialLevel)} className="mt-2 h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus:border-brand"><option value="ALL">Mọi trình độ</option><option value="B1">B1</option><option value="B2">B2</option><option value="C1">C1</option></select></div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-surface px-3 py-2.5 text-sm font-semibold text-ink"><input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} className="size-4 accent-brand" />Mở ngay cho học viên sau khi tải lên</label>
            <input ref={inputRef} type="file" accept={acceptedFiles} onChange={(event) => chooseFile(event.target.files?.[0])} className="sr-only" id="material-file" />
            <label htmlFor="material-file" className="flex min-h-24 cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-brand/30 bg-brand-soft/35 px-4 transition hover:border-brand hover:bg-brand-soft/55"><FileText className="size-7 shrink-0 text-brand" /><span className="min-w-0"><span className="block truncate text-sm font-extrabold text-ink">{file?.name || "Chọn file tài liệu"}</span><span className="mt-1 block text-xs text-ink-muted">{file ? `${formatFileSize(file.size)} · sẵn sàng tải lên` : "PDF, DOCX, PPTX, XLSX, JPG, PNG, MP3, MP4…"}</span></span></label>
          </div>
          {error ? <div role="alert" className="mt-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"><AlertCircle className="mt-0.5 size-4 shrink-0" /><p>{error}</p></div> : null}
          {success ? <div role="status" className="mt-4 flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800"><CheckCircle2 className="mt-0.5 size-4 shrink-0" /><p>{success}</p></div> : null}
          <button type="button" onClick={() => void submit()} disabled={pending} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-btn)] bg-brand px-5 text-sm font-extrabold text-white transition hover:bg-brand-dark disabled:cursor-wait disabled:opacity-55">{pending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}{pending ? "Đang tải lên…" : "Tải tài liệu lên"}</button>
        </div>

        <div className="rounded-[24px] border border-border bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-wide text-brand">KHO ĐÃ TẢI</p><h2 className="mt-1 font-[family-name:var(--font-jakarta)] text-lg font-extrabold text-ink">Tài liệu gần đây</h2></div><span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand">{materials.length} file</span></div>
          {materials.length ? <div className="mt-4 space-y-3">{materials.map((material) => <article key={material.id} className="flex items-start gap-3 rounded-2xl border border-border/80 p-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface text-brand"><FileText className="size-5" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-extrabold text-ink">{material.title}</h3><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${material.published ? "bg-emerald-50 text-emerald-700" : "bg-surface text-ink-muted"}`}>{material.published ? "Đã mở" : "Đang ẩn"}</span></div><p className="mt-1 truncate text-xs text-ink-muted">{material.fileName}</p><p className="mt-1 text-[11px] text-ink-faint">{materialSkillLabel(material.skill)} · {materialLevelLabel(material.level)} · {formatFileSize(material.sizeBytes)}</p></div><a href={`/api/materials/${material.id}`} className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-xl border border-border text-brand transition hover:border-brand hover:bg-brand-soft" aria-label={`Tải ${material.title}`}><Download className="size-4" /></a></article>)}</div> : <div className="mt-4 rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-ink-muted">Chưa có tài liệu nào. Hãy tải file đầu tiên ở khung bên trái.</div>}
        </div>
      </div>
    </section>
  );
}
