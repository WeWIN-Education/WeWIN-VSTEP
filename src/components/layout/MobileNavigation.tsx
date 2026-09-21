"use client";

import { usePathname } from "next/navigation";
import { useRef } from "react";
import { BookOpen, House, LayoutDashboard, LogIn, Menu, Settings, Users, X } from "lucide-react";
import { NAV_GROUPS, type NavRole } from "@/config/navigation";
import { NavigationLink as Link } from "./NavigationLink";

export function MobileNavigation({ role }: { role: NavRole | null }) {
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const allowed = (roles?: readonly NavRole[]) => !roles || Boolean(role && roles.includes(role));
  const active = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
  const items = [
    { href: role ? "/dashboard" : "/", label: role ? "Tổng quan" : "Trang chủ", icon: role ? LayoutDashboard : House },
    { href: "/exam/vstep", label: "Luyện đề", icon: BookOpen },
    { href: "/feed", label: "Cộng đồng", icon: Users },
    { href: role ? "/profile/settings" : "/login", label: role ? "Cài đặt" : "Đăng nhập", icon: role ? Settings : LogIn },
  ];
  return <>
    <nav aria-label="Điều hướng di động" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-white px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden">
      {items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={active(href) ? "page" : undefined} className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold ${active(href) ? "bg-brand-soft text-brand" : "text-ink-muted"}`}>
        <Icon className="size-5" aria-hidden="true" />{label}
      </Link>)}
      <button type="button" onClick={() => dialog.current?.showModal()} aria-haspopup="dialog" aria-controls="mobile-menu" className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold text-brand"><Menu className="size-5" aria-hidden="true" />Menu</button>
    </nav>
    <dialog id="mobile-menu" ref={dialog} aria-labelledby="mobile-menu-title" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }} className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-border bg-white p-5 text-ink shadow-xl backdrop:bg-black/40">
      <div className="flex items-center justify-between gap-3"><h2 id="mobile-menu-title" className="text-lg font-bold">Menu học tập</h2><button type="button" autoFocus onClick={() => dialog.current?.close()} aria-label="Đóng menu" className="flex min-h-11 min-w-11 items-center justify-center rounded-xl hover:bg-surface"><X aria-hidden="true" className="size-5" /></button></div>
      <nav aria-label="Tất cả chức năng">
        {NAV_GROUPS.map(group => {
          const links = group.items.filter(item => allowed(item.roles)).flatMap(item => item.children
            ? item.children.filter(child => allowed(child.roles)).map(child => ({ ...child, icon: item.icon }))
            : [{ label: role ? item.authenticatedLabel ?? item.label : item.label, href: (role ? item.authenticatedHref ?? item.href : item.href)!, icon: item.icon }]);
          return links.length ? <section key={group.id} className="mt-4">{group.label && <h3 className="mb-2 text-xs font-semibold text-ink-muted">{group.label}</h3>}{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => dialog.current?.close()} aria-current={active(href) ? "page" : undefined} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm ${active(href) ? "bg-brand-soft font-bold text-brand" : "hover:bg-surface"}`}><Icon className="size-5 shrink-0" aria-hidden="true" />{label}</Link>)}</section> : null;
        })}
      </nav>
    </dialog>
  </>;
}
