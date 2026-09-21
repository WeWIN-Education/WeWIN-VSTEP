"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, LayoutDashboard, Settings, ShieldCheck } from "lucide-react";
import { NavigationLink as Link } from "@/components/layout/NavigationLink";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { logoutAction } from "@/lib/auth-actions";

export function AccountMenu({ name, email, admin }: { name: string | null; email: string; admin: boolean }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const displayName = name || email;
  const initials = (name || email).trim().split(/\s+/).slice(-2).map(word => Array.from(word)[0]).join("").toUpperCase();
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  const linkClass = "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-ink hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-brand";
  return <div ref={root} className="relative shrink-0" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false); }}>
    <button ref={trigger} type="button" aria-expanded={open} aria-controls="header-account-panel" aria-label={`Tài khoản ${displayName}`} onClick={() => setOpen(value => !value)} className="flex min-h-12 items-center gap-3 rounded-2xl border-2 border-transparent p-1.5 text-left transition-colors hover:border-brand-soft hover:bg-brand-soft/40 focus-visible:outline-2 focus-visible:outline-brand">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-white bg-brand text-sm font-bold text-white shadow-sm" aria-hidden="true">{initials}</span>
      <span className="hidden min-w-0 sm:block"><span className="block max-w-40 truncate text-sm font-bold text-ink" title={displayName}>{displayName}</span><span className="mt-0.5 block text-xs font-medium text-ink-muted">{admin ? "Quản trị viên" : "Học viên VSTEP"}</span></span>
      <ChevronDown aria-hidden="true" className={`size-4 text-ink-muted motion-safe:transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <div id="header-account-panel" className="absolute right-0 top-full mt-2 w-[min(288px,calc(100vw-24px))] rounded-2xl border-2 border-border bg-white p-2 shadow-xl">
      <div className="border-b border-border px-3 py-3"><p className="break-words text-sm font-bold text-ink">{displayName}</p><p className="mt-1 break-all text-xs text-ink-muted">{email}</p></div>
      <nav aria-label="Tài khoản" className="space-y-1 py-2" onClick={() => setOpen(false)}>
        <Link href="/dashboard" className={linkClass}><LayoutDashboard className="size-4" aria-hidden="true" />Tổng quan</Link>
        <Link href="/profile/settings" className={linkClass}><Settings className="size-4" aria-hidden="true" />Cài đặt tài khoản</Link>
        {admin && <Link href="/manage/users" className={linkClass}><ShieldCheck className="size-4" aria-hidden="true" />Quản trị hệ thống</Link>}
      </nav>
      <form action={logoutAction} className="border-t border-border pt-2"><LogoutButton /></form>
    </div>}
  </div>;
}
