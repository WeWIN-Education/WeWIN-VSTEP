import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, BookOpen, Headphones, Mic, PenLine } from "lucide-react";
import { ThemeControl } from "@/components/layout/ThemeControl";
import styles from "./auth.module.css";

export function AuthSplitLayout({ children, badge, title, subtitle }: { children: ReactNode; badge: string; title: string; subtitle: string }) {
  return <div className={styles.page}>
    <header className={styles.header}>
      <Link href="/" aria-label="WEWIN VSTEP — Trang chủ"><Image src="/brand/wewin-logo-gold.webp" alt="WEWIN Education" width={600} height={135} sizes="150px" className={styles.logo} priority /></Link>
      <ThemeControl />
    </header>
    <main className={styles.main}>
      <div className={styles.intro}><span>WEWIN VSTEP</span><h1>{title}</h1><p>{subtitle}</p></div>
      <section className={styles.card} aria-label="Đăng nhập tài khoản WEWIN">
        <div className={styles.cardBanner}>
          <div><span>{badge}</span><h2>Một tài khoản.<br />Cả hành trình luyện thi.</h2><div className={styles.skillIcons} aria-label="Nghe, Đọc, Viết, Nói"><Headphones aria-hidden="true" /><BookOpen aria-hidden="true" /><PenLine aria-hidden="true" /><Mic aria-hidden="true" /></div></div>
          <Image src="/brand/mascots/friendly.webp" alt="" width={150} height={150} sizes="130px" />
        </div>
        <div className={styles.form}>{children}</div>
      </section>
      <Link href="/" className={styles.back}><ArrowLeft size={16} aria-hidden="true" /> Trở về trang chủ</Link>
    </main>
    <footer className={styles.footer}><span>© {new Date().getFullYear()} WEWIN Education</span><nav aria-label="Chính sách"><Link href="/legal/terms">Điều khoản</Link><Link href="/legal/privacy">Bảo mật</Link></nav></footer>
  </div>;
}
