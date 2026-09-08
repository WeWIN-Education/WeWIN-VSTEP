import { auth } from "@/auth";
import { logoutAction } from "@/lib/auth-actions";
import Link from "next/link";

export async function Header() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="sticky top-0 z-30 flex h-[var(--header-height)] items-center justify-end gap-2 border-b border-border bg-white px-4 md:px-6">
      <div className="mr-auto hidden items-center sm:flex">
        <span className="rounded-md bg-brand-soft px-2 py-1 text-[12px] font-semibold text-brand">
          Ưu đãi premium trọn đời 499k dành cho bạn
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <span
          className="inline-flex size-8 items-center justify-center rounded-full border border-border text-[11px] font-bold text-ink-muted"
          title="Facebook"
        >
          f
        </span>
        <span
          className="inline-flex size-8 items-center justify-center rounded-full border border-border text-[10px] font-bold text-ink-muted"
          title="Pinterest"
        >
          pin
        </span>
        <span
          className="inline-flex size-8 items-center justify-center overflow-hidden rounded-full border border-border text-[14px]"
          title="Tiếng Việt"
          aria-label="Ngôn ngữ: Tiếng Việt"
        >
          🇻🇳
        </span>
      </div>

      {user ? (
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="hidden max-w-[140px] truncate text-[13px] font-semibold text-ink sm:inline"
            title={user.email ?? undefined}
          >
            {user.name || user.email}
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex h-8 min-w-[88px] items-center justify-center rounded-[10px] border border-brand/40 bg-white px-3 font-[family-name:var(--font-jakarta)] text-xs font-semibold text-ink transition-colors hover:border-brand hover:text-brand"
            >
              ĐĂNG XUẤT
            </button>
          </form>
        </div>
      ) : (
        <>
          <Link
            href="/login"
            className="inline-flex h-8 min-w-[96px] items-center justify-center rounded-[10px] border border-brand/40 bg-white px-3 font-[family-name:var(--font-jakarta)] text-xs font-semibold text-ink transition-colors hover:border-brand hover:text-brand"
          >
            ĐĂNG NHẬP
          </Link>
          <Link
            href="/register"
            className="inline-flex h-8 min-w-[88px] items-center justify-center rounded-[10px] bg-brand px-3 font-[family-name:var(--font-jakarta)] text-xs font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            ĐĂNG KÝ
          </Link>
        </>
      )}
    </header>
  );
}
