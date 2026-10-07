"use client";
import { useEffect, useRef, useState } from "react";
import type { TabAttentionState } from "@/lib/classroom/domain";
import { Button } from "@/components/ui/Button";

type Snapshot = {
  serverTime: string;
  learners: {
    userId: string;
    name: string | null;
    state: TabAttentionState;
    awaySince: string | null;
    lastSignalAt: string | null;
  }[];
};

export function useTabSignal(
  id: string,
  grantId: string | undefined,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled || !grantId) return;
    const deviceId = localStorage.getItem("wewin-live-device");
    if (!deviceId) return;
    let stopped = false,
      running = false,
      queued: boolean | undefined;
    const controller = new AbortController();
    async function flush() {
      if (running) return;
      running = true;
      try {
        while (!stopped && queued !== undefined) {
          const visible = queued;
          queued = undefined;
          await fetch(`/api/sessions/${id}/attention`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ grantId, deviceId, visible }),
            signal: AbortSignal.any([
              controller.signal,
              AbortSignal.timeout(10000),
            ]),
          }).catch(() => undefined);
        }
      } finally {
        running = false;
      }
    }
    const send = () => {
      queued = document.visibilityState === "visible";
      void flush();
    };
    send();
    const interval = setInterval(send, 20000);
    document.addEventListener("visibilitychange", send);
    return () => {
      stopped = true;
      queued = undefined;
      controller.abort();
      clearInterval(interval);
      document.removeEventListener("visibilitychange", send);
    };
  }, [id, grantId, enabled]);
}

export function useTabRoster(id: string, enabled: boolean) {
  const [data, setData] = useState<Snapshot | null>(null),
    [fresh, setFresh] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    setFresh(false);
    if (!enabled) return;
    let stopped = false,
      running = false,
      controller: AbortController | undefined;
    async function load() {
      if (document.hidden || running || stopped) return;
      running = true;
      controller = new AbortController();
      try {
        const response = await fetch(`/api/sessions/${id}/attention`, {
          cache: "no-store",
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(10000),
          ]),
        });
        if (!response.ok) throw new Error("Không tải được trạng thái tab.");
        const snapshot: Snapshot = await response.json();
        if (!stopped && !document.hidden) {
          setData(snapshot);
          setError("");
          setFresh(true);
        }
      } catch {
        if (!stopped) {
          setFresh(false);
          setError(
            "Mất kết nối cập nhật. Dữ liệu bên dưới đã cũ; đang thử lại.",
          );
        }
      } finally {
        running = false;
      }
    }
    const visibility = () => {
      setFresh(false);
      if (document.hidden) controller?.abort();
      else void load();
    };
    void load();
    const interval = setInterval(() => void load(), 5000);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      stopped = true;
      controller?.abort();
      clearInterval(interval);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [id, enabled]);
  return { data, fresh, error };
}

const labels: Record<TabAttentionState, string> = {
  VISIBLE: "Đang mở tab lớp",
  AWAY_PENDING: "Vừa rời tab",
  AWAY: "Rời tab hơn 30 giây",
  UNKNOWN: "Chưa có tín hiệu",
};
export function TabAttentionPanel({
  data,
  fresh,
  error,
  mobile,
  onClose,
}: ReturnType<typeof useTabRoster> & { mobile: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (mobile) element?.showModal();
    return () => element?.close();
  }, [mobile]);
  useEffect(() => {
    if (mobile) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) onClose();
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [mobile, onClose]);
  const learners = [...(data?.learners || [])].sort((a, b) => {
    if ((a.state === "AWAY") !== (b.state === "AWAY"))
      return a.state === "AWAY" ? -1 : 1;
    if (a.state === "AWAY" && b.state === "AWAY")
      return Date.parse(a.awaySince!) - Date.parse(b.awaySince!);
    return (a.name || "").localeCompare(b.name || "", "vi");
  });
  const content = (
    <>
      <header className="flex items-center justify-between gap-3">
        <h2 id="tab-attention-title" className="text-base font-semibold">
          Trạng thái tab
        </h2>
        <Button
          size="sm"
          variant="ghost"
          className="min-h-11 hover:bg-brand-soft hover:text-brand"
          onClick={onClose}
        >
          Đóng
        </Button>
      </header>
      <p className="mt-2 text-xs leading-6 text-ink-muted">
        Trạng thái tab chỉ là tín hiệu tham khảo. Học viên có thể đang xem học
        liệu hoặc dùng Zoom app; giáo viên hỏi lại qua mic/chat.
      </p>
      <p role="status" className="mt-3 text-xs leading-6 text-ink-muted">
        {error ||
          (!data
            ? "Đang tải trạng thái…"
            : `${fresh ? "Cập nhật" : "Dữ liệu đã cũ"} lúc ${new Date(data.serverTime).toLocaleTimeString("vi-VN")}`)}
      </p>
      <ul className="mt-3 max-h-[65dvh] overflow-y-auto divide-y divide-border">
        {learners.map((learner) => {
          const seconds =
            learner.awaySince && data
              ? Math.max(
                  0,
                  Math.floor(
                    (Date.parse(data.serverTime) -
                      Date.parse(learner.awaySince)) /
                      1000,
                  ),
                )
              : 0;
          return (
            <li key={learner.userId} className="py-3">
              <p className="break-words text-sm font-medium">
                {learner.name || "Học viên chưa có tên"}
              </p>
              <span
                className={`mt-2 inline-flex rounded-lg px-2 py-1 text-xs ${learner.state === "AWAY" ? "bg-attention-warning-bg text-attention-warning-ink" : learner.state === "VISIBLE" ? "bg-brand-soft text-brand" : "bg-surface text-ink-muted"}`}
              >
                {labels[learner.state]}
              </span>
              {learner.awaySince && (
                <p className="mt-1 text-xs text-ink-muted">
                  Rời tab{" "}
                  {seconds < 60
                    ? `${seconds} giây`
                    : `${Math.floor(seconds / 60)} phút ${seconds % 60} giây`}
                  {!fresh ? " · lần cập nhật trước" : ""}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {data && !learners.length && (
        <p className="mt-4 text-sm text-ink-muted">
          Chưa có học viên đang ghi danh.
        </p>
      )}
    </>
  );
  if (mobile)
    return (
      <dialog
        ref={dialog}
        aria-labelledby="tab-attention-title"
        onCancel={(event) => {
          event.preventDefault();
          onClose();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
        className="m-auto max-h-[calc(100dvh-24px)] w-[calc(100%-24px)] max-w-md overflow-auto rounded-2xl border border-border bg-surface-card p-5 text-ink shadow-xl backdrop:bg-black/40"
      >
        <div>{content}</div>
      </dialog>
    );
  return (
    <aside
      aria-labelledby="tab-attention-title"
      className="rounded-2xl border border-border bg-surface-card p-5"
    >
      {content}
    </aside>
  );
}
