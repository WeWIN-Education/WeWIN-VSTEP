"use client";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { NavigationLink as Link } from "@/components/layout/NavigationLink";
import { api } from "./shared";
type Notification = {
  id: string;
  title: string;
  href: string;
  readAt: string | null;
};
export function NotificationMenu() {
  const [items, setItems] = useState<Notification[]>([]),
    [open, setOpen] = useState(false),
    [error, setError] = useState("");
  const root = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    void api<Notification[]>("/api/notifications")
      .then(setItems)
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <div
      ref={root}
      className="relative"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-label={`Thông báo, ${items.filter((i) => !i.readAt).length} chưa đọc`}
        aria-expanded={open}
        aria-controls="classroom-notifications"
        onClick={() => {
          setOpen((v) => !v);
          void api<Notification[]>("/api/notifications")
            .then(setItems)
            .catch(() => setError("Không tải được thông báo."));
        }}
        className="relative flex size-11 items-center justify-center rounded-xl hover:bg-brand-soft"
      >
        <Bell className="size-5" aria-hidden="true" />
        {items.some((i) => !i.readAt) && (
          <span className="absolute top-2 right-2 size-2 rounded-full bg-brand" />
        )}
      </button>
      {open && (
        <div
          id="classroom-notifications"
          className="fixed inset-x-3 top-20 z-50 mt-2 max-h-96 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:w-[340px] overflow-y-auto rounded-2xl border border-border bg-surface-card p-3 shadow-xl"
        >
          <p className="px-2 py-2 text-sm font-bold">Thông báo</p>
          {error && <p role="alert">{error}</p>}
          {!items.length && (
            <p className="p-3 text-sm text-ink-muted">Chưa có thông báo mới.</p>
          )}
          {items.map((i) => (
            <Link
              key={i.id}
              href={i.href}
              onClick={() => {
                setOpen(false);
                void api(`/api/notifications/${i.id}`, "PATCH", {})
                  .then(() =>
                    setItems((v) =>
                      v.map((n) =>
                        n.id === i.id
                          ? { ...n, readAt: new Date().toISOString() }
                          : n,
                      ),
                    ),
                  )
                  .catch(() => undefined);
              }}
              className={`mb-1 block rounded-xl p-3 text-sm ${i.readAt ? "text-ink-muted" : "bg-brand-soft font-medium text-ink"}`}
            >
              {i.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
