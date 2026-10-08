"use client";
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize,
  Minus,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { api } from "./shared";

export type PreviewFile = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  previewPageCount: number | null;
  previewError: string | null;
};
export function DocumentViewer({
  file,
  page,
  onPageChange,
  locked = false,
}: {
  file: PreviewFile;
  page: number;
  onPageChange: (page: number) => void;
  locked?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null),
    area = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    pdf = useRef<PDFDocumentProxy | null>(null);
  const [width, setWidth] = useState(480),
    [zoom, setZoom] = useState(1),
    [count, setCount] = useState(file.previewPageCount || 1),
    [loaded, setLoaded] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const isPdf = file.mimeType === "application/pdf";
  useEffect(() => {
    const element = area.current;
    if (!element) return;
    const observer = new ResizeObserver(() =>
      setWidth(Math.max(100, element.clientWidth - 32)),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let canceled = false;
    let task: ReturnType<typeof import("pdfjs-dist").getDocument> | undefined;
    pdf.current = null;
    setLoaded(0);
    setError(file.previewError || "");
    setLoading(!file.previewError);
    setCount(file.previewPageCount || 1);
    setZoom(1);
    if (!isPdf || file.previewError) return;
    void (async () => {
      // PDF.js and its worker are loaded only when a PDF is actually opened.
      const lib = await import("pdfjs-dist");
      if (canceled) return;
      lib.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
      task = lib.getDocument({
        url: `/api/classroom-files/${file.id}/view`,
        withCredentials: true,
        disableStream: true,
        disableAutoFetch: true,
        rangeChunkSize: 65536,
        cMapUrl: "/pdfjs/cmaps/",
        cMapPacked: true,
        standardFontDataUrl: "/pdfjs/standard_fonts/",
        wasmUrl: "/pdfjs/wasm/",
      });
      task.onPassword = () => {
        if (!canceled) {
          setError(
            "PDF có mật khẩu. Hãy tải bản gốc hoặc nhờ giáo viên cung cấp PDF không khóa.",
          );
          setLoading(false);
        }
        void task?.destroy();
      };
      const doc = await task.promise;
      if (canceled) return;
      pdf.current = doc;
      setCount(doc.numPages);
      setLoaded(1);
    })().catch(() => {
      if (!canceled) {
        setError(
          "Không mở được PDF. Kiểm tra kết nối hoặc tải bản gốc xuống máy.",
        );
        setLoading(false);
      }
    });
    return () => {
      canceled = true;
      pdf.current = null;
      void task?.destroy();
    };
  }, [file.id, file.previewError, file.previewPageCount, isPdf]);
  useEffect(() => {
    const doc = pdf.current,
      element = canvas.current;
    if (!doc || !element || !loaded) return;
    let canceled = false;
    let render:
      ReturnType<import("pdfjs-dist").PDFPageProxy["render"]> | undefined;
    setLoading(true);
    void (async () => {
      const pdfPage = await doc.getPage(Math.min(page, doc.numPages));
      if (canceled) return;
      const base = pdfPage.getViewport({ scale: 1 }),
        ratio = Math.min(devicePixelRatio || 1, 2);
      const viewport = pdfPage.getViewport({
        scale: (width / base.width) * zoom,
      });
      element.width = Math.ceil(viewport.width * ratio);
      element.height = Math.ceil(viewport.height * ratio);
      element.style.width = `${viewport.width}px`;
      element.style.height = `${viewport.height}px`;
      render = pdfPage.render({
        canvas: element,
        viewport,
        transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
      });
      await render.promise;
      if (!canceled) {
        setLoading(false);
        setError("");
      }
      if (page < doc.numPages)
        void doc
          .getPage(page + 1)
          .then((p) => p.getOperatorList())
          .catch(() => undefined);
    })().catch(() => {
      if (!canceled) {
        setLoading(false);
        setError(
          "Chưa tải được trang này. Thử trang khác hoặc kiểm tra kết nối.",
        );
      }
    });
    return () => {
      canceled = true;
      render?.cancel();
    };
  }, [loaded, page, width, zoom]);
  return (
    <div
      ref={root}
      className="flex h-full min-h-[400px] min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface-card text-ink"
    >
      <header className="space-y-3 border-b border-border p-4">
        <p className="break-words text-sm font-semibold">{file.name}</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              className="min-h-11 px-3"
              aria-label="Trang trước"
              disabled={locked || page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft size={16} />
            </Button>
            <span className="px-2 text-xs tabular-nums" aria-live="polite">
              {page} / {count}
            </span>
            <Button
              variant="outline"
              className="min-h-11 px-3"
              aria-label="Trang sau"
              disabled={locked || page >= count}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <Button
              variant="ghost"
              className="min-h-11 px-2 hover:bg-brand-soft hover:text-brand"
              aria-label="Thu nhỏ tài liệu"
              disabled={zoom <= 0.5}
              onClick={() => setZoom((v) => Math.max(0.5, v - 0.25))}
            >
              <Minus size={16} />
            </Button>
            <Button
              variant="ghost"
              className="min-h-11 px-2 hover:bg-brand-soft hover:text-brand"
              onClick={() => setZoom(1)}
              title="Vừa chiều rộng"
            >
              {Math.round(zoom * 100)}%
            </Button>
            <Button
              variant="ghost"
              className="min-h-11 px-2 hover:bg-brand-soft hover:text-brand"
              aria-label="Phóng to tài liệu"
              disabled={zoom >= 3}
              onClick={() => setZoom((v) => Math.min(3, v + 0.25))}
            >
              <Plus size={16} />
            </Button>
            <Button
              variant="ghost"
              className="min-h-11 px-2 hover:bg-brand-soft hover:text-brand"
              aria-label="Xem tài liệu toàn màn hình"
              onClick={() => {
                if (document.fullscreenElement) void document.exitFullscreen();
                else
                  void root.current
                    ?.requestFullscreen?.()
                    .catch(() => undefined);
              }}
            >
              <Maximize size={16} />
            </Button>
            <a
              href={`/api/classroom-files/${file.id}/download`}
              className="inline-flex min-h-11 items-center gap-2 px-2 text-xs text-brand"
            >
              <Download size={16} aria-hidden />
              Tải về
            </a>
          </div>
        </div>
      </header>
      {error && (
        <p
          role="alert"
          className="m-4 rounded-xl border border-border p-3 text-sm leading-6"
        >
          {error}
        </p>
      )}
      <div
        ref={area}
        className="relative min-h-0 flex-1 overflow-auto bg-surface p-4"
      >
        {loading && (
          <p role="status" className="mb-3 text-xs text-ink-muted">
            Đang mở tài liệu…
          </p>
        )}
        {isPdf ? (
          <canvas
            ref={canvas}
            role="img"
            aria-label={`${file.name}, trang ${page}`}
            className="mx-auto bg-white"
          />
        ) : (
          !error && (
            /* Private authenticated image endpoint must be requested directly by the browser. */
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/classroom-files/${file.id}/view`}
              alt={file.name}
              style={{ width: width * zoom, maxWidth: "none" }}
              className="mx-auto h-auto"
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setError(
                  "Không tải được ảnh. Kiểm tra kết nối hoặc tải bản gốc.",
                );
              }}
            />
          )
        )}
      </div>
    </div>
  );
}
export function FilePage({ id }: { id: string }) {
  const [file, setFile] = useState<PreviewFile | null>(null),
    [page, setPage] = useState(1),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setFile(null);
    setPage(1);
    setError("");
    void api<PreviewFile>(`/api/classroom-files/${id}/metadata`)
      .then((f) => {
        if (active) setFile(f);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [id]);
  return (
    <div className="mx-auto max-w-[1200px] space-y-4">
      <h1 className="text-xl font-semibold">Xem học liệu</h1>
      {error ? (
        <p role="alert">{error}</p>
      ) : file ? (
        <div className="h-[75dvh]">
          <DocumentViewer file={file} page={page} onPageChange={setPage} />
        </div>
      ) : (
        <p role="status">Đang mở học liệu…</p>
      )}
    </div>
  );
}
