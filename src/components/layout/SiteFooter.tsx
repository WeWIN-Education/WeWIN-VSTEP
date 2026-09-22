import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Globe2,
  Mail,
  MapPin,
  MessageCircle,
  PhoneCall,
  type LucideIcon,
} from "lucide-react";
import { FOOTER_COLUMNS } from "@/config/navigation";

const CONTACT_CARDS: Array<{
  label: string;
  value: string;
  href: string;
  icon: LucideIcon;
  external?: boolean;
}> = [
  {
    label: "Cơ sở 1",
    value: "292B Nơ Trang Long, Phường 12, Quận Bình Thạnh, TP HCM",
    href: "https://www.google.com/maps/search/?api=1&query=292B%20N%C6%A1%20Trang%20Long%2C%20Ph%C6%B0%E1%BB%9Dng%2012%2C%20Qu%E1%BA%ADn%20B%C3%ACnh%20Th%E1%BA%A1nh%2C%20TP%20HCM",
    icon: MapPin,
    external: true,
  },
  {
    label: "Hotline cơ sở 1",
    value: "0345 969 388",
    href: "tel:+84345969388",
    icon: PhoneCall,
  },
  {
    label: "Cơ sở 2",
    value: "742 Xô Viết Nghệ Tĩnh, phường Thạnh Mỹ Tây, Bình Thạnh, TP.HCM",
    href: "https://www.google.com/maps/search/?api=1&query=742%20X%C3%B4%20Vi%E1%BA%BFt%20Ngh%E1%BB%87%20T%C4%A9nh%2C%20ph%C6%B0%E1%BB%9Dng%20Th%E1%BA%A1nh%20M%E1%BB%B9%20T%C3%A2y%2C%20B%C3%ACnh%20Th%E1%BA%A1nh%2C%20TP.HCM",
    icon: MapPin,
    external: true,
  },
  {
    label: "Hotline cơ sở 2",
    value: "037 866 9388",
    href: "tel:+84378669388",
    icon: PhoneCall,
  },
  {
    label: "Email",
    value: "officemanager@wewin.edu.vn",
    href: "mailto:officemanager@wewin.edu.vn",
    icon: Mail,
  },
  {
    label: "Website",
    value: "wewin.edu.vn",
    href: "https://wewin.edu.vn",
    icon: Globe2,
    external: true,
  },
];

const SOCIAL_LINKS = [
  {
    label: "Zalo WEWIN",
    href: "https://zalo.me/0345969388",
    className: "bg-[#0068FF]",
    content: <span aria-hidden="true" className="text-sm font-extrabold">Z</span>,
    external: true,
  },
  {
    label: "Facebook WEWIN Education",
    href: "https://www.facebook.com/winwineducation",
    className: "bg-[#1877F2]",
    content: <span aria-hidden="true" className="text-lg font-extrabold leading-none">f</span>,
    external: true,
  },
  {
    label: "TikTok WEWIN Education",
    href: "https://www.tiktok.com/@wewin.education.vn",
    className: "bg-zinc-950",
    content: (
      <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden="true">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2a6.34 6.34 0 0 0 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.18 8.18 0 0 0 4.76 1.52V6.84a4.85 4.85 0 0 1-1-.15Z" />
      </svg>
    ),
    external: true,
  },
  {
    label: "YouTube WEWIN Education",
    href: "https://www.youtube.com/@WeWINEducation",
    className: "bg-[#FF0000]",
    content: (
      <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden="true">
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8ZM9.75 15.5v-7l6.5 3.5-6.5 3.5Z" />
      </svg>
    ),
    external: true,
  },
  {
    label: "Email WEWIN",
    href: "mailto:officemanager@wewin.edu.vn",
    className: "bg-[var(--footer-blue)]",
    content: <Mail className="size-4" aria-hidden="true" />,
    external: false,
  },
] as const;

function ContactCard({ card }: { card: (typeof CONTACT_CARDS)[number] }) {
  const Icon = card.icon;

  return (
    <a
      href={card.href}
      target={card.external ? "_blank" : undefined}
      rel={card.external ? "noopener noreferrer" : undefined}
      className="group flex min-h-[72px] min-w-0 w-full items-start gap-3 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-left transition-colors hover:border-white/20 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--footer-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--footer-navy)]"
    >
      <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[var(--footer-accent)]" aria-hidden="true">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-medium leading-tight text-white/65">{card.label}</span>
        <span className="mt-1 block break-words text-xs font-semibold leading-snug text-white">{card.value}</span>
      </span>
    </a>
  );
}

export function SiteFooter() {
  const [aboutColumn, legalColumn] = FOOTER_COLUMNS;

  return (
    <footer className="mt-10 overflow-hidden rounded-[28px] border border-white/10 border-t-4 border-t-[var(--footer-blue)] bg-[var(--footer-navy)] text-white shadow-[0_18px_50px_-28px_rgba(0,52,140,0.9)]">
      <div className="mx-auto grid w-full max-w-[1400px] gap-8 px-5 py-7 sm:px-8 sm:py-9 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)] lg:items-start lg:gap-10 lg:px-10 lg:py-10">
        <div className="min-w-0">
          <Link
            href="/"
            aria-label="WEWIN Education - Trang chủ"
            className="inline-flex min-h-11 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--footer-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--footer-navy)]"
          >
            <Image
              src="/brand/wewin-logo-gold.png"
              alt="WEWIN Education"
              width={198}
              height={45}
              sizes="198px"
              className="h-auto w-[170px] sm:w-[198px]"
            />
          </Link>
          <p className="mt-2 max-w-md text-xs leading-relaxed text-white/85">
            WEWIN BỨT PHÁ TIẾNG ANH – VƯƠN TẦM THẾ GIỚI
          </p>

          <div className="mt-4 flex flex-wrap gap-2" aria-label="Kênh liên hệ WEWIN">
            {SOCIAL_LINKS.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target={social.external ? "_blank" : undefined}
                rel={social.external ? "noopener noreferrer" : undefined}
                aria-label={social.label}
                className={`inline-flex size-11 items-center justify-center rounded-full text-white transition hover:scale-105 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--footer-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--footer-navy)] motion-reduce:transition-none motion-reduce:hover:scale-100 ${social.className}`}
              >
                {social.content}
              </a>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-white/80">
            <a className="inline-flex min-h-11 items-center gap-2 rounded-lg transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--footer-accent)]" href="tel:+84345969388">
              <PhoneCall className="size-4 text-[var(--footer-accent)]" aria-hidden="true" />
              0345 969 388
            </a>
            <a className="inline-flex min-h-11 items-center gap-2 rounded-lg transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--footer-accent)]" href="tel:+84378669388">
              <PhoneCall className="size-4 text-[var(--footer-accent)]" aria-hidden="true" />
              037 866 9388
            </a>
          </div>

          <Link
            href="/contact"
            className="mt-4 inline-flex min-h-11 w-fit items-center gap-2 rounded-[var(--radius-btn)] border border-white/20 bg-white/10 px-4 text-sm font-extrabold text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--footer-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--footer-navy)]"
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            Liên hệ hỗ trợ
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="min-w-0">
          <h2 className="text-sm font-extrabold text-white">Thông tin liên hệ</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {CONTACT_CARDS.map((card) => (
              <ContactCard key={card.label} card={card} />
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 px-5 py-4 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-3 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} WeWIN Education. All rights reserved.</p>
          <nav aria-label="Liên kết website" className="flex flex-wrap gap-x-4 gap-y-2">
            {[...aboutColumn.links, ...legalColumn.links].map((link) => (
              <Link key={link.href} href={link.href} className="transition hover:text-white focus-visible:outline-none">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
