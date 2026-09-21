import type { NavRole } from "@/config/navigation";
import { VstepStatsBar } from "@/components/gamification/VstepStatsBar";
import { getGamificationSummary } from "@/lib/gamification";
import Image from "next/image";
import { NavigationLink as Link } from "@/components/layout/NavigationLink";
import { AccountMenu } from "@/components/layout/AccountMenu";

type HeaderUser = { id: string; email: string; name: string | null; role: NavRole };

export async function Header({ user }: { user: HeaderUser | null }) {
  const gamification = user ? await getGamificationSummary(user.id) : null;
  return (
    <header className="sticky top-0 z-50 border-b-2 border-brand-soft bg-white shadow-[0_4px_20px_rgb(0_74_173_/_0.03)]">
      <div className="flex min-h-[var(--header-height)] items-center gap-3 px-3 sm:px-6">
        <Link href="/" aria-label="WEWIN Education - Trang chủ" className="flex min-h-11 shrink-0 items-center rounded-lg focus-visible:outline-2 focus-visible:outline-brand lg:w-[232px]">
          <Image src="/brand/wewin-logo-gold.png" alt="WEWIN EDUCATION" width={150} height={37} className="h-auto w-[120px] sm:w-[150px]" priority />
        </Link>
        <div className="hidden border-l-2 border-brand-soft pl-5 2xl:block">
          <p className="text-xs font-medium tracking-widest text-ink-muted">WEWIN LEARNING</p>
          <p className="mt-1 text-sm font-bold text-brand">Luyện thi VSTEP</p>
        </div>
        {gamification && <div className="ml-auto hidden xl:block"><VstepStatsBar summary={gamification} /></div>}
        <div className={`flex shrink-0 items-center border-border sm:pl-4 ${gamification ? "ml-auto xl:ml-2 xl:border-l" : "ml-auto"}`}>
          {user ? <AccountMenu name={user.name} email={user.email} admin={user.role === "ADMIN"} /> : <Link href="/login" className="inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-brand bg-brand px-5 text-sm font-bold text-white transition-colors hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">Đăng nhập</Link>}
        </div>
      </div>
      {gamification && <div className="border-t border-brand-soft bg-gradient-to-r from-brand-soft/30 to-white px-3 py-2 sm:px-6 xl:hidden"><VstepStatsBar summary={gamification} /></div>}
    </header>
  );
}
