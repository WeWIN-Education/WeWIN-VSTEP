"use client";

import { NAV_GROUPS } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

function isActivePath(pathname: string, href?: string) {
  if (!href) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();

  const initiallyOpen = useMemo(() => {
    const open = new Set<string>();
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        if (item.children?.some((child) => isActivePath(pathname, child.href))) {
          open.add(item.label);
        }
      }
    }
    if (open.size === 0) open.add("Khóa học");
    return open;
  }, [pathname]);

  const [openMenus, setOpenMenus] = useState<Set<string>>(initiallyOpen);

  function toggle(label: string) {
    setOpenMenus((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-[var(--sidebar-width)] flex-col border-r border-border bg-white">
      <div className="flex h-[var(--header-height)] items-center border-b border-border px-4">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <Image
            src="/brand/wewin-logo-gold.png"
            alt="WEWIN EDUCATION"
            height={40}
            width={160}
            className="h-9 w-auto max-w-[168px] object-contain object-left"
            priority
          />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 font-[family-name:var(--font-jakarta)]">
        {NAV_GROUPS.map((group) => (
          <div key={group.id} className="mb-4">
            {group.label ? (
              <div className="mb-1.5 px-2 text-[10px] font-semibold tracking-[0.08em] text-ink-faint">
                {group.label}
              </div>
            ) : null}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const hasChildren = Boolean(item.children?.length);
                const open = openMenus.has(item.label);
                const active =
                  isActivePath(pathname, item.href) ||
                  item.children?.some((c) => isActivePath(pathname, c.href));

                if (hasChildren) {
                  return (
                    <li key={item.label}>
                      <button
                        type="button"
                        onClick={() => toggle(item.label)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] font-medium transition-colors",
                          active
                            ? "bg-brand-soft text-brand"
                            : "text-ink-muted hover:bg-surface hover:text-ink",
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-[18px] shrink-0",
                            active ? "text-brand" : "text-brand/70",
                          )}
                          strokeWidth={1.5}
                        />
                        <span className="flex-1">{item.label}</span>
                        <ChevronDown
                          className={cn(
                            "size-4 transition-transform",
                            open ? "rotate-0" : "-rotate-90",
                          )}
                          strokeWidth={1.5}
                        />
                      </button>
                      {open ? (
                        <ul className="mt-0.5 ml-3 space-y-0.5 border-l border-border pl-3">
                          {item.children!.map((child) => {
                            const childActive = isActivePath(pathname, child.href);
                            return (
                              <li key={child.href}>
                                <Link
                                  href={child.href}
                                  className={cn(
                                    "flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12.5px] transition-colors",
                                    childActive
                                      ? "bg-brand-soft font-semibold text-brand"
                                      : "text-ink-muted hover:bg-surface hover:text-ink",
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "size-1.5 shrink-0 rounded-full",
                                      childActive ? "bg-brand" : "bg-border",
                                    )}
                                  />
                                  {child.label}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </li>
                  );
                }

                return (
                  <li key={item.label}>
                    <Link
                      href={item.href!}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium transition-colors",
                        active
                          ? "bg-brand-soft text-brand"
                          : "text-ink-muted hover:bg-surface hover:text-ink",
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-[18px] shrink-0",
                          active ? "text-brand" : "text-brand/70",
                        )}
                        strokeWidth={1.5}
                      />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <Link
          href="/register"
          className="flex w-full items-center justify-center rounded-[var(--radius-btn)] bg-brand px-3 py-2.5 font-[family-name:var(--font-jakarta)] text-[13px] font-bold text-white hover:bg-brand-dark"
        >
          Bắt đầu miễn phí
        </Link>
        <p className="mt-2 px-1 text-center font-[family-name:var(--font-be-vietnam)] text-[11px] leading-snug text-ink-muted">
          Đăng ký để lưu tiến độ, nhận XP, streak và lộ trình tiếng Anh riêng cho bạn.
        </p>
      </div>
    </aside>
  );
}
