import type { NavRole } from "@/config/navigation";
import { VstepStatsBar } from "@/components/gamification/VstepStatsBar";
import { getGamificationSummary } from "@/lib/gamification";
import Image from "next/image";
import { NavigationLink as Link } from "@/components/layout/NavigationLink";
import { ThemeControl } from "./ThemeControl";
import { NotificationMenu } from "../classroom/NotificationMenu";
import { classroomEnabled } from "@/lib/classroom/access";
import { AccountMenu } from "@/components/layout/AccountMenu";

type HeaderUser = { id: string; email: string; name: string | null; role: NavRole };

export async function Header({ user }: { user: HeaderUser | null }) {
  const gamification = user && user.role !== "TEACHER" ? await getGamificationSummary(user.id) : null;
  return (
    <header className="sticky top-0 z-50 border-b-2 border-brand-soft bg-surface-card shadow-[0_4px_20px_rgb(0_74_173_/_0.03)]">
      <div className="grid min-h-[var(--header-height)] grid-cols-[auto_1fr] items-center gap-x-3 px-3 sm:px-6 xl:grid-cols-[auto_1fr_auto] 2xl:grid-cols-[auto_1fr_auto_auto]">
        <Link href="/" aria-label="WEWIN Education - Trang chủ" className="flex min-h-11 shrink-0 items-center rounded-lg focus-visible:outline-2 focus-visible:outline-brand lg:w-[232px]">
          <Image src="/brand/wewin-logo-gold.png" alt="WEWIN EDUCATION" width={150} height={37} className="h-auto w-[120px] sm:w-[150px]" priority />
        </Link>
        <div className="hidden border-l-2 border-brand-soft pl-5 2xl:block">
          <p className="text-xs font-medium tracking-widest text-ink-muted">WEWIN LEARNING</p>
          <p className="mt-1 text-sm font-bold text-brand">Luyện thi VSTEP</p>
        </div>
        {gamification && <div className="order-last col-span-2 mt-1 border-t border-brand-soft py-2 xl:order-none xl:col-span-1 xl:mt-0 xl:justify-self-end xl:border-0 xl:py-0"><VstepStatsBar summary={gamification} /></div>}
        <div className={`col-start-2 row-start-1 flex items-center justify-self-end border-border sm:pl-4 xl:col-start-3 2xl:col-start-4 ${gamification ? "xl:ml-2 xl:border-l" : ""}`}>
          {!gamification && <span className="mr-2"><ThemeControl /></span>}
          {user ? <><span className="mr-2">{classroomEnabled() && <NotificationMenu />}</span><AccountMenu teacher={user.role === "TEACHER"} name={user.name} email={user.email} admin={user.role === "ADMIN"} /></> : <Link href="/login" className="inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-brand bg-brand px-4 text-sm font-bold text-white transition-colors hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">Đăng nhập</Link>}
        </div>
      </div>
    </header>
  );
}
