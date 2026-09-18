import { FOOTER_COLUMNS } from "@/config/navigation";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-border bg-white">
      <div className="grid gap-8 px-1 py-8 sm:grid-cols-2 lg:grid-cols-3">
        {FOOTER_COLUMNS.map((col) => (
          <div key={col.title}>
            <h3 className="mb-3 font-[family-name:var(--font-jakarta)] text-sm font-bold text-ink">
              {col.title}
            </h3>
            <ul className="space-y-2">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[13px] text-ink-muted hover:text-brand"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h3 className="mb-3 font-[family-name:var(--font-jakarta)] text-sm font-bold text-ink">
            Học tiếng Anh dễ dàng
          </h3>
          <p className="text-[13px] leading-relaxed text-ink-muted">
            WEWIN EDUCATION giúp giáo viên Việt Nam luyện VSTEP và tiếng Anh dùng trong lớp học.
          </p>
        </div>
      </div>
      <div className="border-t border-border py-4 text-[11px] text-ink-faint">
        © {new Date().getFullYear()} WEWIN EDUCATION.
      </div>
    </footer>
  );
}
