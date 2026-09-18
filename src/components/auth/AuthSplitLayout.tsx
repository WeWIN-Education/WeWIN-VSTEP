import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Mascot } from "@/components/ui/Mascot";

export function AuthSplitLayout({
  children,
  badge,
  title,
  subtitle,
}: {
  children: ReactNode;
  badge: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="grid min-h-full lg:grid-cols-2">
      <div className="relative flex flex-col px-4 py-6 sm:px-8">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center">
            <Image
              src="/brand/wewin-logo-gold.png"
              alt="WEWIN EDUCATION"
              width={150}
              height={40}
              className="h-9 w-auto object-contain"
              priority
            />
          </Link>
          <span
            className="inline-flex size-8 items-center justify-center overflow-hidden rounded-full border border-border text-[14px]"
            title="Ngôn ngữ tiếng Việt"
            aria-label="Ngôn ngữ tiếng Việt"
          >
            VN
          </span>
        </div>

        <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center">
          <div className="rounded-[20px] border border-border/80 bg-white p-6 shadow-[0_8px_30px_rgba(11,31,92,0.06)] sm:p-8">
            <span className="inline-flex rounded-full bg-[#FEF3C7] px-3 py-1 text-[11px] font-bold tracking-wide text-[#B45309]">
              {badge}
            </span>
            <h1 className="mt-3 font-[family-name:var(--font-jakarta)] text-[26px] font-extrabold text-ink">
              {title}
            </h1>
            <p className="mt-1.5 text-[14px] text-ink-muted">{subtitle}</p>
            <div className="mt-6">{children}</div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between text-[11px] text-ink-faint">
          <span>© {new Date().getFullYear()} WEWIN</span>
          <div className="flex gap-3">
            <Link href="/legal/terms" className="hover:text-brand">
              Điều khoản
            </Link>
            <Link href="/legal/privacy" className="hover:text-brand">
              Bảo mật
            </Link>
          </div>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-brand lg:flex lg:flex-col lg:items-center lg:justify-center lg:px-10 lg:py-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          aria-hidden
        >
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-[family-name:var(--font-jakarta)] text-[280px] font-black leading-none text-white">
            A
          </div>
        </div>

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="relative mb-8">
            <div className="flex size-56 items-center justify-center rounded-full bg-white/95 shadow-xl">
              <div className="relative size-44">
                <Mascot state="friendly" size={176} animated />
              </div>
            </div>
            <span className="absolute -right-2 top-6 rounded-2xl bg-white px-3 py-1.5 text-[12px] font-semibold text-brand shadow-md">
              Hello!
            </span>
          </div>

          <p className="max-w-sm text-[15px] font-medium italic text-white/80">
            &ldquo;The journey of a thousand miles begins with one step.&rdquo;
          </p>
          <h2 className="mt-3 max-w-md font-[family-name:var(--font-jakarta)] text-[28px] font-extrabold leading-snug text-white">
            Đường ngàn dặm bắt đầu từ bước chân đầu tiên.
          </h2>
          <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-white/75">
            Gia nhập cộng đồng học viên đang chinh phục tiếng Anh mỗi ngày cùng
            WEWIN EDUCATION.
          </p>
        </div>
      </div>
    </div>
  );
}
