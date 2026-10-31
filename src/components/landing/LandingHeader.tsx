"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { ThemeControl } from "@/components/layout/ThemeControl";
import styles from "./landing.module.css";

const links = [
  ["#cach-hoc", "Cách học"],
  ["#ky-nang", "4 kỹ năng"],
  ["/vocabulary/topics", "Từ vựng"],
  ["#ho-tro", "Hỗ trợ"],
] as const;

export function LandingHeader({ loggedIn }: { loggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); }
    };
    const outside = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) setOpen(false);
    };
    const media = window.matchMedia("(min-width: 1024px)");
    const onWide = () => { if (media.matches) setOpen(false); };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", outside);
    media.addEventListener("change", onWide);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", outside);
      media.removeEventListener("change", onWide);
    };
  }, [open]);

  return <header ref={header} className={styles.header}>
    <div className={styles.headerBar}>
      <Link href="/" aria-label="WEWIN VSTEP — Trang chủ" className={styles.logo}>
        <Image src="/brand/wewin-logo-gold.webp" alt="WEWIN Education" width={600} height={135} sizes="(max-width: 639px) 116px, 154px" priority />
        <span>VSTEP</span>
      </Link>
      <nav className={styles.desktopNav} aria-label="Điều hướng chính">
        {links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
      </nav>
      <div className={styles.headerActions}>
        <ThemeControl />
        <Link className={styles.loginLink} href={loggedIn ? "/dashboard" : "/login"}>{loggedIn ? "Vào học" : "Đăng nhập"}</Link>
        <button ref={toggle} type="button" className={styles.menuToggle} aria-label={open ? "Đóng menu" : "Mở menu"} aria-expanded={open} aria-controls="landing-menu" onClick={() => setOpen(!open)}>
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>
    </div>
    {open && <nav id="landing-menu" className={styles.mobileNav} aria-label="Điều hướng trên điện thoại">
      {links.map(([href, label]) => <Link key={href} href={href} onClick={() => setOpen(false)}>{label}</Link>)}
      <Link href="/exam/vstep" onClick={() => setOpen(false)}>Học thử VSTEP</Link>
    </nav>}
  </header>;
}
