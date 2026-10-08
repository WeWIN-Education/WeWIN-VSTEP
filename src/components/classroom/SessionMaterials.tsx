"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { api } from "./shared";
import { DocumentViewer, type PreviewFile } from "./DocumentViewer";
type Slide = { fileId: string | null; page: number };
type Snapshot = {
  active: boolean;
  files: PreviewFile[];
  presentation: Slide & { revision: number; updatedAt: string | null };
};
export function SessionMaterials({
  id,
  connected,
  staff,
  initialFileId,
}: {
  id: string;
  connected: boolean;
  staff: boolean;
  initialFileId: string | null;
}) {
  const [data, setData] = useState<Snapshot | null>(null),
    [fresh, setFresh] = useState(false),
    [error, setError] = useState(""),
    [own, setOwn] = useState<Slide | null>(null),
    [draft, setDraft] = useState<Slide | null>(null);
  const latest = useRef<Snapshot | null>(null),
    pending = useRef<Slide | null>(null),
    sending = useRef(false),
    alive = useRef(true),
    opened = useRef(false);
  const merge = useCallback((next: Snapshot) => {
    if (
      !alive.current ||
      (latest.current &&
        next.presentation.revision < latest.current.presentation.revision)
    )
      return;
    latest.current = next;
    setData(next);
    setFresh(true);
  }, []);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      pending.current = null;
    };
  }, []);
  useEffect(() => {
    if (!connected) {
      setFresh(false);
      return;
    }
    let stopped = false,
      running = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    const poll = async () => {
      if (stopped || running || document.visibilityState !== "visible") return;
      running = true;
      clearTimeout(timer);
      try {
        const r = await fetch(`/api/sessions/${id}/presentation`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const next = await r.json();
        if (!r.ok)
          throw new Error(next.error || "Không cập nhật được học liệu.");
        if (!stopped) {
          merge(next);
          if (!sending.current) setError("");
        }
        if (!next.active) return;
      } catch (e) {
        if (!stopped) {
          setFresh(false);
          setError(e instanceof Error ? e.message : "Mất kết nối học liệu.");
        }
      } finally {
        running = false;
      }
      if (!stopped) timer = setTimeout(() => void poll(), 2000);
    };
    const wake = () => {
      clearTimeout(timer);
      if (document.visibilityState === "visible") void poll();
      else setFresh(false);
    };
    void poll();
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("online", wake);
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller.abort();
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("online", wake);
    };
  }, [id, connected, merge]);
  const present = useCallback(
    async (slide: Slide) => {
      if (!connected || !latest.current?.active) return;
      pending.current = slide;
      setDraft(slide);
      if (sending.current) return;
      sending.current = true;
      setError("");
      try {
        while (pending.current && alive.current) {
          const next = pending.current;
          pending.current = null;
          const response = await api<Snapshot>(
            `/api/sessions/${id}/presentation`,
            "PUT",
            { ...next, revision: latest.current!.presentation.revision },
          );
          merge(response);
        }
      } catch (e) {
        pending.current = null;
        if (alive.current) {
          setFresh(false);
          setError(
            e instanceof Error ? e.message : "Chưa đổi được trình chiếu.",
          );
        }
        // Do not replay an old page after a revision conflict with another controller.
        await api<Snapshot>(`/api/sessions/${id}/presentation`)
          .then(merge)
          .catch(() => undefined);
      } finally {
        sending.current = false;
        if (alive.current) setDraft(null);
      }
    },
    [connected, id, merge],
  );
  useEffect(() => {
    if (!staff || !connected || !data || opened.current || !initialFileId)
      return;
    opened.current = true;
    const file = data.files.find((f) => f.id === initialFileId);
    if (file?.previewPageCount && !file.previewError)
      void present({ fileId: file.id, page: 1 });
    else
      setError("Học liệu được chọn chưa sẵn sàng hoặc không thuộc buổi này.");
  }, [data, staff, connected, initialFileId, present]);
  const slide = staff ? draft || data?.presentation : own || data?.presentation;
  const file = data?.files.find((f) => f.id === slide?.fileId);
  const changePage = (page: number) => {
    if (!slide) return;
    if (staff) void present({ fileId: slide.fileId, page });
    else if (own) setOwn({ fileId: own.fileId, page });
  };
  return (
    <section
      className="flex h-full min-h-[460px] min-w-0 flex-col gap-3"
      aria-label="Học liệu trong phòng học"
    >
      <div className="space-y-3 rounded-2xl border border-border bg-surface-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Học liệu</h2>
          {!staff && file && (
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() =>
                setOwn(own ? null : { fileId: file.id, page: slide?.page || 1 })
              }
            >
              {own ? "Theo giáo viên" : "Xem riêng"}
            </Button>
          )}
          {staff && slide?.fileId && (
            <Button
              variant="outline"
              className="min-h-11"
              disabled={!connected || !fresh}
              onClick={() => void present({ fileId: null, page: 1 })}
            >
              Dừng trình chiếu
            </Button>
          )}
        </div>
        <p role="status" className="text-xs leading-6 text-ink-muted">
          {!connected
            ? "Kết nối Zoom để cập nhật trình chiếu."
            : error
              ? `${error} Dữ liệu đang giữ ở lần cập nhật trước.`
              : !fresh
                ? "Đang cập nhật kết nối học liệu…"
                : !data?.active
                  ? "Buổi học đã kết thúc."
                  : staff
                    ? draft
                      ? "Đang đồng bộ trang…"
                      : "Chọn học liệu để trình chiếu cho cả lớp."
                    : own
                      ? "Bạn đang xem riêng. Theo giáo viên để trở lại trang của lớp."
                      : "Trang tự chuyển theo giáo viên."}
        </p>
        {data && (staff || own) && (
          <label className="block text-xs text-ink-muted">
            {staff ? "Trình chiếu trong lớp" : "Tài liệu xem riêng"}
            <select
              className="mt-2 min-h-11 w-full rounded-xl border border-border bg-surface-card px-3 text-sm text-ink"
              value={slide?.fileId || ""}
              disabled={staff && (!connected || !fresh || !data.active)}
              onChange={(e) => {
                const next = { fileId: e.target.value || null, page: 1 };
                if (staff) void present(next);
                else setOwn(next);
              }}
            >
              <option value="">
                {staff ? "Chọn PDF hoặc ảnh" : "Chọn tài liệu"}
              </option>
              {data.files.map((f) => (
                <option
                  key={f.id}
                  value={f.id}
                  disabled={staff && (!f.previewPageCount || !!f.previewError)}
                >
                  {f.name}
                  {!f.previewPageCount
                    ? f.previewError
                      ? " · lỗi bản xem"
                      : " · đang chuẩn bị"
                    : ""}
                </option>
              ))}
            </select>
          </label>
        )}
        {!staff && own && !file && (
          <Button variant="outline" onClick={() => setOwn(null)}>
            Theo giáo viên
          </Button>
        )}
      </div>
      <div className="min-h-0 flex-1">
        {file ? (
          <DocumentViewer
            file={file}
            page={slide?.page || 1}
            onPageChange={changePage}
            locked={staff ? !fresh || !connected || !data?.active : !own}
          />
        ) : (
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-surface-card px-6 text-center">
            <p className="text-sm font-medium">
              {data
                ? "Chưa có tài liệu đang trình chiếu"
                : "Học liệu của buổi học"}
            </p>
            <p className="max-w-sm text-pretty text-sm leading-7 text-ink-muted">
              {staff
                ? "PDF và ảnh đã công bố cho lớp hoặc buổi này sẽ hiện trong danh sách. Word và PowerPoint cần xuất thành PDF trước."
                : "Khi giáo viên mở học liệu, tài liệu sẽ xuất hiện ở đây. Bạn vẫn nghe được Zoom khi xem tài liệu."}
            </p>
            {!staff && data?.files.length && !own ? (
              <Button
                variant="outline"
                onClick={() => setOwn({ fileId: data.files[0].id, page: 1 })}
              >
                Xem riêng
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
