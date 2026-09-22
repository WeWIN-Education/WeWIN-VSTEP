import { FOOTER_COLUMNS } from "@/config/navigation";
import { ArrowUpRight, Clock3, Mail, MessageCircle } from "lucide-react";
import Link from "next/link";

export function SiteFooter() {
  const [aboutColumn, legalColumn] = FOOTER_COLUMNS;

  return (
    <footer className="mt-10 overflow-hidden rounded-[28px] border border-white/20 bg-[linear-gradient(120deg,var(--footer-navy)_0%,var(--brand)_50%,var(--footer-blue)_100%)] text-white shadow-[0_18px_50px_-28px_rgba(0,52,140,0.9)]">
      <div className="grid gap-10 px-5 py-7 sm:px-8 sm:py-9 lg:grid-cols-[minmax(0,.72fr)_minmax(0,1.28fr)] lg:gap-14 lg:px-10 lg:py-10">
        <div className="flex flex-col justify-between gap-8">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--footer-accent)]">
              WEWIN EDUCATION
            </p>
            <h2 className="mt-3 max-w-xs font-[family-name:var(--font-jakarta)] text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
              LUYỆN THI VSTEP
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[var(--footer-muted)]">
              Học đúng trọng tâm, luyện đủ bốn kỹ năng và theo dõi tiến bộ rõ ràng.
            </p>
          </div>

          <Link
            href="/contact"
            className="inline-flex min-h-11 w-fit items-center gap-2 rounded-[var(--radius-btn)] border border-white/25 bg-white/10 px-4 text-sm font-extrabold text-white transition hover:bg-white/20 focus-visible:outline-white"
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            Liên hệ hỗ trợ
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        <div>
          <h2 className="flex items-center gap-2 font-[family-name:var(--font-jakarta)] text-xl font-extrabold text-white">
            <MessageCircle className="size-5 text-[var(--footer-accent)]" aria-hidden="true" />
            Thông tin hỗ trợ
          </h2>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <a
              href="mailto:support@wewin.education"
              className="group flex min-h-20 items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 transition hover:bg-white/15 focus-visible:outline-white"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-[var(--footer-accent)]">
                <Mail className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-bold text-[var(--footer-muted)]">Email hỗ trợ</span>
                <span className="mt-1 block break-all text-sm font-extrabold text-white">support@wewin.education</span>
              </span>
              <ArrowUpRight className="ml-auto size-4 shrink-0 text-white/60 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
            </a>

            <div className="flex min-h-20 items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-[var(--footer-accent)]">
                <Clock3 className="size-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-xs font-bold text-[var(--footer-muted)]">Thời gian phản hồi</span>
                <span className="mt-1 block text-sm font-extrabold text-white">Thứ 2–Thứ 7, 9:00–18:00</span>
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link
              href={aboutColumn.links[0].href}
              className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/15 focus-visible:outline-white"
            >
              {aboutColumn.links[0].label}
              <ArrowUpRight className="size-4 text-white/60" aria-hidden="true" />
            </Link>
            <Link
              href={aboutColumn.links[1].href}
              className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/15 focus-visible:outline-white"
            >
              {aboutColumn.links[1].label}
              <ArrowUpRight className="size-4 text-white/60" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-white/20 px-5 py-4 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-3 text-xs text-[var(--footer-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} WEWIN EDUCATION LUYỆN THI VSTEP.</p>
          <nav aria-label="Liên kết pháp lý" className="flex flex-wrap gap-x-4 gap-y-2">
            {legalColumn.links.map((link) => (
              <Link key={link.href} href={link.href} className="transition hover:text-white focus-visible:outline-white">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
