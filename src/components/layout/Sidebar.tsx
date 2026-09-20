"use client";

import { NAV_GROUPS, type NavRole } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { NavigationLink as Link } from "@/components/layout/NavigationLink";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

function isActivePath(pathname: string, href?: string) {
  if (!href) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isAllowed(roles: readonly NavRole[] | undefined, role: NavRole | null | undefined) {
  return !roles || Boolean(role && roles.includes(role));
}

type SidebarUser = {
  name?: string | null;
  email?: string | null;
  role?: NavRole | null;
};

export function Sidebar({ user }: { user?: SidebarUser | null }) {
  const pathname = usePathname();

  const visibleGroups = useMemo(
    () =>
      NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items
          .filter((item) => isAllowed(item.roles, user?.role))
          .map((item) => ({
            ...item,
            children: item.children?.filter((child) => isAllowed(child.roles, user?.role)),
          }))
          .filter((item) => !item.children || item.children.length > 0),
      })).filter((group) => group.items.length > 0),
    [user?.role],
  );

  const initiallyOpen = useMemo(() => {
    const open = new Set<string>();
    for (const group of visibleGroups) {
      for (const item of group.items) {
        if (item.children?.some((child) => isActivePath(pathname, child.href))) {
          open.add(item.label);
        }
      }
    }
    if (open.size === 0) open.add("Khóa học");
    return open;
  }, [pathname, visibleGroups]);

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
    <aside className="sticky top-0 hidden h-[calc(100vh-var(--header-height))] w-[var(--sidebar-width)] shrink-0 flex-col border-r border-border bg-white lg:flex">

      <nav className="flex-1 overflow-y-auto px-3 py-3 font-[family-name:var(--font-jakarta)]">
        {visibleGroups.map((group) => (
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
                const label = user ? item.authenticatedLabel ?? item.label : item.label;
                const href = user ? item.authenticatedHref ?? item.href : item.href;
                const active =
                  isActivePath(pathname, href) ||
                  item.children?.some((c) => isActivePath(pathname, c.href));

                if (hasChildren) {
                  return (
                    <li key={item.label}>
                      <button
                        type="button"
                        onClick={() => toggle(item.label)}
                        aria-expanded={open}
                        aria-controls={`nav-${group.id}-${item.label.replace(/\s+/g, "-").toLowerCase()}`}
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
                        <span className="flex-1">{label}</span>
                        <ChevronDown
                          className={cn(
                            "size-4 transition-transform",
                            open ? "rotate-0" : "-rotate-90",
                          )}
                          strokeWidth={1.5}
                        />
                      </button>
                      {open ? (
                        <ul id={`nav-${group.id}-${item.label.replace(/\s+/g, "-").toLowerCase()}`} className="mt-0.5 ml-3 space-y-0.5 border-l border-border pl-3">
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
                                  aria-current={childActive ? "page" : undefined}
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
                      href={href!}
                      aria-current={active ? "page" : undefined}
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
                        <span>{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-border bg-white p-3">
        {user ? (
          <Link href="/profile/settings" className="flex min-w-0 items-center gap-2 rounded-2xl bg-brand-soft px-3 py-2.5 transition-colors hover:bg-brand-soft/70">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-extrabold text-white">{(user.name || user.email || "W").slice(0, 1).toUpperCase()}</span>
            <span className="min-w-0"><strong className="block truncate text-[12px] font-extrabold text-ink">{user.name || "Tài khoản WEWIN"}</strong><span className="block truncate text-[10px] text-ink-muted">{user.role === "ADMIN" ? "Quản trị viên" : user.email}</span></span>
          </Link>
        ) : (
          <Link href="/login" className="flex w-full items-center justify-center rounded-[var(--radius-btn)] bg-brand px-3 py-2.5 font-[family-name:var(--font-jakarta)] text-[13px] font-bold text-white hover:bg-brand-dark">
            Đăng nhập
          </Link>
        )}
      </div>
    </aside>
  );
}
