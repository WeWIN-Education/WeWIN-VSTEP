import { FOOTER_COLUMNS } from "@/config/navigation";
import { ArrowUpRight, Mail, MapPin, MessageCircle, PhoneCall } from "lucide-react";
import Link from "next/link";

const CONTACT_LOCATIONS = [
  ["CS1", "292B Nơ Trang Long, Bình Thạnh, TP.HCM"],
  ["CS2", "742 Xô Viết Nghệ Tĩnh, Thạnh Mỹ Tây, TP.HCM"],
] as const;

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

            <div className="mt-6 space-y-3">
              <a
                href="tel:+84345969388"
                aria-label="Gọi hotline 034 596 9388 hoặc 037 866 9388"
                className="flex min-h-11 w-fit max-w-full items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 text-sm font-extrabold text-white transition hover:bg-white/20 focus-visible:outline-white"
              >
                <PhoneCall className="size-4 shrink-0 text-[var(--footer-accent)]" aria-hidden="true" />
                <span className="break-words">Hotline: 034 596 9388 – 037 866 9388</span>
              </a>
              <a
                href="mailto:it@wewin.edu.vn"
                className="flex min-h-11 w-fit max-w-full items-center gap-2 text-sm font-bold text-[var(--footer-muted)] transition hover:text-white focus-visible:outline-white"
              >
                <Mail className="size-4 shrink-0 text-[var(--footer-accent)]" aria-hidden="true" />
                <span className="break-all">it@wewin.edu.vn</span>
              </a>
            </div>
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
            <MapPin className="size-5 text-[var(--footer-accent)]" aria-hidden="true" />
            Thông tin liên hệ
          </h2>

          <div className="mt-5 flex min-h-14 items-start gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
            <MapPin className="mt-0.5 size-5 shrink-0 text-[var(--footer-accent)]" aria-hidden="true" />
            <p className="min-w-0 break-words text-sm font-extrabold leading-relaxed text-white">
              Địa chỉ: 292B Nơ Trang Long, Phường 12, Quận Bình Thạnh, TP HCM
            </p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {CONTACT_LOCATIONS.map(([label, address]) => (
              <div key={label} className="flex min-h-14 items-start gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm leading-relaxed text-[var(--footer-muted)]">
                <span className="shrink-0 font-extrabold text-white">{label}:</span>
                <span className="min-w-0 break-words">{address}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-white/20 px-5 py-4 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-3 text-xs text-[var(--footer-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} WEWIN EDUCATION LUYỆN THI VSTEP.</p>
          <nav aria-label="Liên kết website" className="flex flex-wrap gap-x-4 gap-y-2">
            {[...aboutColumn.links, ...legalColumn.links].map((link) => (
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
