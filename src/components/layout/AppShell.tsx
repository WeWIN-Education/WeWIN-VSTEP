import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { getCurrentUser } from "@/lib/access";
import Link from "next/link";
import { BookOpen, House, LayoutGrid, LogIn, Newspaper, Settings, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

export async function AppShell({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const mobileItems = user
    ? [
        { href: "/dashboard", label: "Tổng quan", icon: LayoutGrid },
        { href: "/exam/vstep", label: "VSTEP", icon: BookOpen },
        { href: user.role === "ADMIN" ? "/manage/posts" : "/feed", label: user.role === "ADMIN" ? "Bài viết" : "Cộng đồng", icon: user.role === "ADMIN" ? ShieldCheck : Newspaper },
        { href: "/profile/settings", label: "Cài đặt", icon: Settings },
      ]
    : [
        { href: "/", label: "Trang chủ", icon: House },
        { href: "/exam/vstep", label: "Học thử", icon: BookOpen },
        { href: "/feed", label: "Cộng đồng", icon: Newspaper },
        { href: "/login", label: "Đăng nhập", icon: LogIn },
      ];

  return (
    <div className="min-h-full bg-surface">
      <Header user={user} />
      <div className="flex w-full min-w-0">
        <Sidebar user={user} />
        <main className="min-w-0 w-full max-w-[100vw] flex-1 overflow-x-hidden px-4 py-4 pb-20 md:px-6 md:py-5 lg:pb-5">
          {children}
        </main>
      </div>
      <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-4 border-t border-border bg-white/95 px-2 py-2 backdrop-blur lg:hidden">
        {mobileItems.map(({ href, label, icon: Icon }, index) => (
          <Link key={href} href={href} className={`flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold ${index === 0 ? "text-brand" : "text-ink-muted"}`}>
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
