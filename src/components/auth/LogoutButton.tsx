"use client";

import { useFormStatus } from "react-dom";

export function LogoutButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} aria-busy={pending} className="inline-flex min-h-11 min-w-[88px] items-center justify-center rounded-[10px] border border-brand/40 bg-white px-3 text-xs font-semibold text-ink transition-colors hover:border-brand hover:text-brand disabled:cursor-wait disabled:opacity-60">{pending ? "Đang thoát…" : "ĐĂNG XUẤT"}</button>;
}
