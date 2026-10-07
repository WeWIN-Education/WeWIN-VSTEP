"use client";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export type Role = "LEARNER" | "TEACHER" | "ADMIN";
export type Person = {
  id: string;
  name: string | null;
  email?: string;
  role?: Role;
};
export type Session = {
  id: string;
  classId: string;
  title: string;
  hostUserId: string;
  startsAt: string;
  endsAt: string;
  status: string;
  zoomState: string;
  revision: number;
  host: { name: string | null };
};
export type Source = { id: string; title: string; slug?: string };
export type Options = {
  users: Person[];
  materials: Source[];
  videos: Source[];
  contents: Source[];
};
export const statusLabel: Record<string, string> = {
  ACTIVE: "Đang học",
  COMPLETED: "Hoàn thành",
  ARCHIVED: "Lưu trữ",
  WITHDRAWN: "Rút lớp",
  SCHEDULED: "Sắp diễn ra",
  LIVE: "Đang học",
  ENDED: "Đã kết thúc",
  CANCELED: "Đã hủy",
  READY: "Sẵn sàng",
  PENDING: "Chờ xử lý",
  NEEDS_RECONCILE: "Cần đối soát",
  CREATING: "Đang tạo",
  UPDATE_PENDING: "Đang cập nhật",
  DELETE_PENDING: "Đang hủy phòng",
  PRESENT: "Có mặt",
  LATE: "Đi muộn",
  ABSENT: "Vắng",
  EXCUSED: "Vắng có phép",
  SUBMITTED: "Chờ chấm",
  RETURNED: "Đã trả bài",
  REVISION_REQUESTED: "Cần sửa bài",
  UPLOADING: "Đang tải",
  SCAN_PENDING: "Đang quét",
  SCAN_FAILED: "Chưa quét được",
  CLEAN: "An toàn",
  REJECTED: "Tệp bị từ chối",
  QUEUED: "Đợi xử lý",
  RUNNING: "Đang chạy",
  FAILED: "Lỗi",
  DONE: "Hoàn tất",
  RESERVED: "Giữ chỗ",
  JOINED: "Đã vào",
  LEFT: "Đã rời",
  RELEASED: "Đã giải phóng",
};
export function Badge({ value }: { value: string }) {
  return (
    <span className="inline-flex shrink-0 rounded-lg bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">
      {statusLabel[value] || value}
    </span>
  );
}
export function when(value: string) {
  return new Date(value).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "medium",
    timeStyle: "short",
  });
}
export function localDate(value?: string) {
  const d = value ? new Date(value) : new Date(Date.now() + 86400000);
  return new Date(+d + 7 * 3600000).toISOString().slice(0, 16);
}
export function formDate(value: FormDataEntryValue | null) {
  return new Date(`${value}:00+07:00`).toISOString();
}
export async function api<T>(
  url: string,
  method = "GET",
  input?: unknown,
): Promise<T> {
  const response = await fetch(url, {
    method,
    cache: "no-store",
    ...(input !== undefined
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }
      : {}),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(body.error || "Không thể tải dữ liệu. Vui lòng thử lại.");
  return body;
}
export function useAPI<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    if (!url) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setData(await api<T>(url));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, [url]);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { data, error, loading, reload };
}
export function State({
  loading,
  error,
  children,
}: {
  loading: boolean;
  error: string;
  children: ReactNode;
}) {
  if (loading)
    return (
      <div
        role="status"
        className="classroom-panel flex min-h-56 items-center justify-center gap-3 text-ink-muted"
      >
        <LoaderCircle
          aria-hidden="true"
          className="size-5 animate-spin motion-reduce:animate-none"
        />
        Đang chuẩn bị lớp học…
      </div>
    );
  if (error)
    return (
      <p role="alert" className="classroom-panel text-ink">
        {error}
      </p>
    );
  return children;
}
export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface p-8 text-center text-sm leading-6 text-ink-muted">
      {children}
    </div>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block min-w-0 text-sm font-medium text-ink">
      <span className="mb-2 block">{label}</span>
      {children}
    </label>
  );
}
export function Form({
  children,
  submit,
  onDone,
  title = "Lưu",
  className = "",
}: {
  children: ReactNode;
  submit: (form: FormData) => Promise<unknown>;
  onDone?: () => void;
  title?: string;
  className?: string;
}) {
  const [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  async function handle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    setMessage("");
    try {
      await submit(new FormData(event.currentTarget));
      setMessage("Đã lưu thành công.");
      onDone?.();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Không thể lưu. Nội dung được giữ lại.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={handle} className={`space-y-4 ${className}`}>
      <fieldset disabled={pending} className="space-y-4">
        {children}
      </fieldset>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-300 px-3 py-2 text-sm text-ink"
        >
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-brand">
          {message}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Đang lưu…" : title}
      </Button>
    </form>
  );
}
