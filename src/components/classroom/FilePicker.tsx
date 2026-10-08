"use client";
import { upload } from "@vercel/blob/client";
import { useEffect, useState, type ChangeEvent } from "react";
import { api, Badge } from "./shared";
type Uploaded = {
  id: string;
  name: string;
  state: string;
  storageKey: string;
  mimeType: string;
  previewPageCount?: number | null;
  previewError?: string | null;
};
export function FilePicker({
  classId,
  onFiles,
}: {
  classId: string;
  onFiles: (ids: string[]) => void;
}) {
  const [files, setFiles] = useState<Uploaded[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0);
  useEffect(() => {
    const needsUpdate = files.some(
      (f) =>
        ["SCAN_PENDING", "SCAN_FAILED"].includes(f.state) ||
        (f.state === "CLEAN" &&
          ["application/pdf", "image/jpeg", "image/png"].includes(f.mimeType) &&
          !f.previewPageCount &&
          !f.previewError),
    );
    if (!needsUpdate) return;
    let canceled = false,
      running = false;
    const timer = setInterval(() => {
      if (running || document.visibilityState !== "visible") return;
      running = true;
      void Promise.all(
        files.map((f) =>
          api<Uploaded>(`/api/classroom-files/${f.id}`).then((next) => ({
            ...f,
            ...next,
          })),
        ),
      )
        .then((next) => {
          if (!canceled) {
            setFiles(next);
            setError("");
          }
        })
        .catch(() => {
          if (!canceled)
            setError("Mất kết nối kiểm tra tệp. Nội dung đã tải được giữ lại.");
        })
        .finally(() => {
          running = false;
        });
    }, 3000);
    return () => {
      canceled = true;
      clearInterval(timer);
    };
  }, [files]);
  async function select(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setProgress(0);
    setError("");
    try {
      if (file.size > 25 * 1024 * 1024 || files.length >= 5)
        throw new Error("Tối đa 5 tệp, mỗi tệp 25 MB.");
      const ext = file.name.split(".").at(-1)?.toLowerCase(),
        known: Record<string, string> = {
          pdf: "application/pdf",
          docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          png: "image/png",
          mp3: "audio/mpeg",
          m4a: "audio/mp4",
        };
      const row = await api<Uploaded>("/api/classroom-files", "POST", {
        classId,
        name: file.name,
        sizeBytes: file.size,
        mimeType: known[ext || ""] || file.type,
      });
      // Storage mode is exposed by a capability route; credentials never reach the browser.
      const config = await api<{ directUpload: boolean }>(
        "/api/classroom-files/capabilities",
      );
      if (config.directUpload) {
        await upload(row.storageKey, file, {
          access: "private",
          handleUploadUrl: "/api/classroom-files/upload",
          clientPayload: row.id,
          contentType: known[ext || ""] || file.type,
          multipart: true,
          onUploadProgress: ({ percentage }) =>
            setProgress(Math.round(percentage)),
        });
        await api(`/api/classroom-files/${row.id}/complete`, "POST", {});
      } else {
        const form = new FormData();
        form.set("fileId", row.id);
        form.set("file", file);
        const r = await fetch("/api/classroom-files/upload", {
          method: "POST",
          body: form,
        });
        if (!r.ok)
          throw new Error((await r.json()).error || "Không tải được tệp.");
      }
      const next = [...files, { ...row, state: "SCAN_PENDING" }];
      setFiles(next);
      onFiles(next.map((f) => f.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được tệp.");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }
  async function refresh() {
    const next = await Promise.all(
      files.map((f) =>
        api<Uploaded>(`/api/classroom-files/${f.id}`).then((s) => ({
          ...f,
          ...s,
        })),
      ),
    );
    setFiles(next);
  }
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">
        Đính kèm tệp
        <input
          type="file"
          accept=".pdf,.docx,.pptx,.jpg,.jpeg,.png,.mp3,.m4a"
          disabled={busy || files.length >= 5}
          onChange={(e) => void select(e)}
          className="mt-2 block w-full rounded-xl border border-border p-3 text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:text-brand"
        />
      </label>
      <p className="text-xs text-ink-muted">
        Tối đa 25 MB/tệp. Tệp được kiểm tra định dạng và dung lượng trước khi sử
        dụng.
      </p>
      {busy && (
        <p role="status" className="text-sm">
          Đang tải tệp… {progress > 0 ? `${progress}%` : ""}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm">
          {error}
        </p>
      )}
      {files.map((f) => (
        <div key={f.id} className="flex flex-wrap items-center gap-2 text-xs">
          <span className="break-all">{f.name}</span>
          <Badge value={f.state} />
          {f.state === "CLEAN" &&
            ["application/pdf", "image/jpeg", "image/png"].includes(
              f.mimeType,
            ) && (
              <span className="text-ink-muted">
                {f.previewError ||
                  (f.previewPageCount
                    ? "Bản xem sẵn sàng"
                    : "Đang chuẩn bị bản xem…")}
              </span>
            )}
          <button
            type="button"
            onClick={() => {
              const next = files.filter((n) => n.id !== f.id);
              setFiles(next);
              onFiles(next.map((n) => n.id));
            }}
            className="min-h-11 px-2 text-ink-muted"
          >
            Bỏ tệp
          </button>
        </div>
      ))}
      {files.length > 0 && (
        <button
          type="button"
          onClick={() =>
            void refresh().catch(() =>
              setError("Không kiểm tra được trạng thái tệp."),
            )
          }
          className="min-h-11 text-sm font-medium text-brand"
        >
          Kiểm tra trạng thái tệp
        </button>
      )}
    </div>
  );
}
