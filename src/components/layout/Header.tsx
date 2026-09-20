import type { NavRole } from "@/config/navigation";
import { VstepStatsBar } from "@/components/gamification/VstepStatsBar";
import { logoutAction } from "@/lib/auth-actions";
import { getGamificationSummary } from "@/lib/gamification";
import Image from "next/image";
import { NavigationLink as Link } from "@/components/layout/NavigationLink";
import { LogoutButton } from "@/components/auth/LogoutButton";

type HeaderUser = {
  id: string;
  email: string;
  name: string | null;
  role: NavRole;
};

export async function Header({ user }: { user: HeaderUser | null }) {
  const gamification = user ? await getGamificationSummary(user.id) : null;

  return (
    <header className="sticky top-0 z-50 border-b-2 border-brand-soft bg-white px-4 md:px-6">
      <div className="mx-auto flex min-h-[var(--header-height)] w-full items-center gap-3 overflow-hidden md:gap-4">
        <Link href="/" className="flex h-10 w-auto shrink-0 items-center lg:h-full lg:w-[var(--sidebar-width)] lg:border-r lg:border-border lg:pr-6">
          <Image src="/brand/wewin-logo-gold.png" alt="WEWIN EDUCATION" width={150} height={37} className="h-8 w-auto sm:h-9" priority />
        </Link>
        <div className="hidden min-w-0 items-center gap-2 xl:flex">
          <span className="text-[12px] text-ink-muted">Không gian học tập</span>
          <span className="text-ink-faint" aria-hidden="true">/</span>
          <span className="text-[12px] font-semibold text-ink">Giáo viên</span>
        </div>

        {gamification ? <div className="hidden shrink-0 xl:ml-auto xl:block"><VstepStatsBar summary={gamification} /></div> : null}

        <div className={`ml-auto flex items-center gap-1.5 ${gamification ? "xl:ml-0" : ""}`}>
          <span
            className="inline-flex size-8 items-center justify-center overflow-hidden rounded-full border border-border text-[14px]"
            title="Tiếng Việt"
            aria-label="Ngôn ngữ: Tiếng Việt"
          >
            VN
          </span>
          {user ? (
            <div className="flex items-center gap-2">
              {user.role === "ADMIN" ? <Link href="/manage/users" className="hidden h-8 items-center rounded-[10px] border border-brand/30 px-3 text-xs font-semibold text-brand transition-colors hover:border-brand sm:inline-flex">Quản trị</Link> : null}
              <Link href="/dashboard" className="hidden max-w-[140px] truncate text-[13px] font-semibold text-ink sm:inline" title={user.email}>{user.name || user.email}</Link>
              <form action={logoutAction}>
                <LogoutButton />
              </form>
            </div>
          ) : <Link href="/login" className="inline-flex h-9 min-w-[96px] items-center justify-center rounded-[var(--radius-btn)] border border-brand/40 bg-white px-3 font-[family-name:var(--font-jakarta)] text-xs font-semibold text-ink transition-colors hover:border-brand hover:text-brand">ĐĂNG NHẬP</Link>}
        </div>
      </div>

      {gamification ? <div className="border-t border-brand-soft/70 py-2 xl:hidden"><VstepStatsBar summary={gamification} /></div> : null}
    </header>
  );
}
