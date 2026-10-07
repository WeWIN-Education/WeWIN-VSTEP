"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { NavigationLink as Link } from "@/components/layout/NavigationLink";
import { Button } from "@/components/ui/Button";
import { api, type Role } from "./shared";
import { TabAttentionPanel, useTabRoster, useTabSignal } from "./TabAttention";
type Context = {
  signature: string;
  meetingNumber: string;
  password: string;
  userName: string;
  customerKey: string;
  zak?: string;
  appUrl: string;
  grantId: string;
  role: number;
};
export function ZoomRoom({ id, role }: { id: string; role: Role }) {
  const router = useRouter(),
    frame = useRef<HTMLIFrameElement>(null),
    contextRef = useRef<Context | null>(null),
    connectedRef = useRef(false),
    [context, setContext] = useState<Context | null>(null),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false),
    [waiting, setWaiting] = useState(false),
    [connected, setConnected] = useState(false),
    [version, setVersion] = useState(0),
    [mobile, setMobile] = useState(false),
    [roomHeight, setRoomHeight] = useState(720),
    [attentionOpen, setAttentionOpen] = useState(false);
  const staff = role !== "LEARNER",
    roster = useTabRoster(id, staff && attentionOpen),
    awayCount = roster.data?.learners.filter(
      (learner) => learner.state === "AWAY",
    ).length;
  useTabSignal(id, context?.grantId, role === "LEARNER" && connected);
  const closeAttention = useCallback(() => {
    setAttentionOpen(false);
    requestAnimationFrame(() =>
      document.getElementById("tab-attention-trigger")?.focus(),
    );
  }, []);
  useEffect(() => {
    const media = matchMedia("(max-width:1023px)");
    const resize = () => setMobile(media.matches);
    resize();
    media.addEventListener("change", resize);
    const leave = () => {
      if (role === "LEARNER" && connectedRef.current) {
        connectedRef.current = false;
        void fetch(`/api/sessions/${id}/leave`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
          keepalive: true,
        }).catch(() => undefined);
      }
    };
    window.addEventListener("pagehide", leave);
    return () => {
      media.removeEventListener("change", resize);
      window.removeEventListener("pagehide", leave);
      leave();
    };
  }, [id, role]);
  useEffect(() => {
    if (!pending || waiting) return;
    const timeout = setTimeout(() => {
      setPending(false);
      setError(
        "Kết nối đang mất nhiều thời gian. Bạn có thể thử lại hoặc mở ứng dụng Zoom dự phòng.",
      );
    }, 45000);
    return () => clearTimeout(timeout);
  }, [pending, waiting, version]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.origin !== location.origin ||
        event.source !== frame.current?.contentWindow
      )
        return;
      if (event.data?.type === "wewin-zoom-ready" && contextRef.current)
        frame.current?.contentWindow?.postMessage(
          {
            type: "wewin-zoom-join",
            context: {
              ...contextRef.current,
              theme: document.documentElement.dataset.theme || "light",
              mobile:
                matchMedia("(max-width:1023px)").matches ||
                /Android|iPhone|iPad/.test(navigator.userAgent),
            },
          },
          location.origin,
        );
      if (event.data?.type === "wewin-zoom-connected") {
        connectedRef.current = true;
        setError("");
        setConnected(true);
        setPending(false);
        setWaiting(false);
      }
      if (event.data?.type === "wewin-zoom-waiting") setWaiting(true);
      if (event.data?.type === "wewin-zoom-size") {
        const height = Number(event.data.message);
        if (Number.isFinite(height))
          setRoomHeight(Math.min(1400, Math.max(400, height)));
      }
      if (
        event.data?.type === "wewin-zoom-error" ||
        event.data?.type === "wewin-zoom-closed"
      ) {
        if (connectedRef.current && role === "LEARNER")
          void api(`/api/sessions/${id}/leave`, "POST", {}).catch(
            () => undefined,
          );
        connectedRef.current = false;
        setError(event.data.message || "Zoom chưa kết nối được.");
        setPending(false);
        setConnected(false);
        setWaiting(false);
      }
      if (event.data?.type === "wewin-zoom-left") {
        connectedRef.current = false;
        setConnected(false);
        void api(`/api/sessions/${id}/leave`, "POST", {})
          .then(() => router.push(`/sessions/${id}`))
          .catch((e) => setError(e.message));
      }
    };
    window.addEventListener("message", receive);
    const observer = new MutationObserver(() =>
      frame.current?.contentWindow?.postMessage(
        {
          type: "wewin-zoom-theme",
          theme: document.documentElement.dataset.theme,
        },
        location.origin,
      ),
    );
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => {
      window.removeEventListener("message", receive);
      observer.disconnect();
    };
  }, [id, role, router]);
  async function start() {
    if (pending) return;
    setPending(true);
    setWaiting(false);
    setError("");
    try {
      let device = localStorage.getItem("wewin-live-device");
      if (!device) {
        device = crypto.randomUUID();
        localStorage.setItem("wewin-live-device", device);
      }
      const result = await api<Context>(
        `/api/sessions/${id}/join-context`,
        "POST",
        { deviceId: device },
      );
      contextRef.current = result;
      setContext(result);
      setMobile(matchMedia("(max-width:1023px)").matches);
      setVersion((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chưa vào được lớp.");
      setPending(false);
    }
  }
  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-brand">WEWIN ONLINE</p>
          <h1 className="mt-2 text-2xl">Phòng học trực tuyến</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {staff && (
            <Button
              id="tab-attention-trigger"
              variant="outline"
              aria-expanded={attentionOpen}
              aria-controls="tab-attention-panel"
              title={
                roster.data
                  ? `Số liệu ${roster.fresh ? "cập nhật" : "lần xem trước"}; mở danh sách để cập nhật.`
                  : "Xem trạng thái tab học viên"
              }
              className={
                mobile && context ? "fixed left-3 top-2 z-[80] min-h-11" : "min-h-11"
              }
              onClick={() => setAttentionOpen((open) => !open)}
            >
              Trạng thái tab{awayCount !== undefined ? ` · ${awayCount}` : ""}
            </Button>
          )}
          <Link
            href={`/sessions/${id}`}
            className="inline-flex min-h-11 items-center px-3 text-sm text-brand"
          >
            Thông tin buổi
          </Link>
          {context && (
            <Button
              variant="outline"
              className={mobile ? "fixed right-3 top-2 z-[80]" : undefined}
              onClick={() =>
                frame.current?.contentWindow?.postMessage(
                  { type: "wewin-zoom-leave" },
                  location.origin,
                )
              }
            >
              Rời lớp
            </Button>
          )}
        </div>
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-2xl border border-border bg-surface-card p-4 text-sm"
        >
          {error}
        </p>
      )}
      {!connected && (
        <section className="classroom-panel space-y-4">
          <h2 className="text-lg">
            {waiting
              ? "Tiếp tục vào lớp trong cửa sổ Zoom bên dưới"
              : pending
                ? "Đang kết nối phòng học…"
                : "Sẵn sàng vào lớp"}
          </h2>
          <p className="text-sm leading-7 text-ink-muted">
            Cho phép trình duyệt dùng mic và camera. Giáo viên sẽ duyệt phòng
            chờ; các nút mic, camera, chat, giơ tay và chia sẻ nằm trong vùng
            Zoom.
          </p>
          {!staff && (
            <p className="text-sm leading-7 text-ink-muted">
              Giáo viên có thể thấy trạng thái mở/rời tab lớp học để hỗ trợ và
              nhắc nhở.
            </p>
          )}
          <Button disabled={pending} onClick={() => void start()}>
            {pending
              ? "Đang vào lớp…"
              : context
                ? "Thử kết nối lại"
                : "Kiểm tra quyền & vào lớp"}
          </Button>
        </section>
      )}
      <div
        className={
          staff && attentionOpen && !mobile
            ? "grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]"
            : "min-w-0"
        }
      >
        <div className="min-w-0">
          {context && (
            <>
              <iframe
                key={version}
                ref={frame}
                src="/classroom-room/index.html"
                title="Phòng Zoom WEWIN"
                allow="camera; microphone; display-capture; fullscreen; autoplay; clipboard-write"
                style={mobile ? undefined : { height: roomHeight }}
                className={`border border-border bg-surface-card ${mobile ? "fixed inset-x-0 top-16 z-[60] h-[calc(100dvh-64px)] w-full" : "w-full rounded-2xl"}`}
              />
              <div className="classroom-panel text-sm leading-7">
                <p>
                  Nếu trình duyệt không kết nối được, bạn có thể mở ứng dụng
                  Zoom. Rời phòng web trước khi chuyển sang app, rồi chờ giáo
                  viên đối chiếu tên và duyệt.
                </p>
                <a
                  href={context.appUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex min-h-11 items-center text-brand"
                >
                  Mở Zoom app dự phòng ↗
                </a>
              </div>
            </>
          )}
        </div>
        {staff && attentionOpen && (
          <div id="tab-attention-panel">
            <TabAttentionPanel
              {...roster}
              mobile={mobile}
              onClose={closeAttention}
            />
          </div>
        )}
      </div>
    </div>
  );
}
