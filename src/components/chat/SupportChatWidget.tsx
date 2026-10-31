"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ExternalLink, LoaderCircle, Mail, MessageCircle, Phone, RotateCcw, X } from "lucide-react";
import { OPEN_CHAT_EVENT } from "./OpenChatButton";
import styles from "./chat.module.css";

// A dedicated VSTEP bot can be configured without changing the reference source.
const botId = (process.env.NEXT_PUBLIC_FASTBOTS_BOT_ID || "cm6t5x0pl1e32svk4sez4rwwq").trim();
const chatUrl = /^[a-zA-Z0-9_-]{5,100}$/.test(botId) ? `https://app.fastbots.ai/embed/${botId}` : null;

function canShow(path: string) {
  return path === "/" || path === "/login" || path === "/about" || path === "/contact" || path === "/exam/vstep" || path.startsWith("/vocabulary/") || path === "/video";
}

export function SupportChatWidget() {
  const pathname = usePathname();
  const allowed = canShow(pathname);
  const dialog = useRef<HTMLDialogElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [ready, setReady] = useState(false);
  const [slow, setSlow] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const show = () => { if (allowed) { opener.current = document.activeElement as HTMLElement | null; setOpen(true); setLoaded(true); } };
    window.addEventListener(OPEN_CHAT_EVENT, show);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, show);
  }, [allowed]);

  useEffect(() => {
    if (!allowed) { setOpen(false); setLoaded(false); setReady(false); setSlow(false); }
  }, [allowed]);

  useEffect(() => {
    if (open && allowed) {
      if (!dialog.current?.open) dialog.current?.showModal();
      closeButton.current?.focus();
    } else {
      dialog.current?.close();
    }
  }, [open, allowed]);

  useEffect(() => {
    if (!loaded || ready || !chatUrl) return;
    const timer = window.setTimeout(() => setSlow(true), 12000);
    return () => window.clearTimeout(timer);
  }, [loaded, ready, retry]);

  function close() { setOpen(false); }
  function reload() { setReady(false); setSlow(false); setRetry(value => value + 1); }

  return <>
    {allowed && <button ref={launcher} type="button" className={`${styles.launcher} ${pathname === "/" || pathname === "/login" ? styles.standalone : ""}`} aria-label="Mở hỗ trợ WEWIN VSTEP" aria-haspopup="dialog" aria-expanded={open} onClick={() => { opener.current = launcher.current; setOpen(true); setLoaded(true); }}>
      <span className={styles.launcherText}>Bạn cần hỗ trợ?</span>
      <Image src="/brand/mascots/friendly.webp" alt="" width={76} height={76} sizes="76px" />
      <span className={styles.bubble}><MessageCircle size={17} aria-hidden="true" /></span>
    </button>}
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="support-chat-title" onCancel={close} onClose={() => { setOpen(false); if (allowed) (opener.current?.isConnected ? opener.current : launcher.current)?.focus(); }} onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <div className={styles.panel}>
        <div className={styles.heading}><Image src="/brand/mascots/friendly.webp" alt="" width={42} height={42} /><div><h2 id="support-chat-title">WEWIN VSTEP</h2><p>{chatUrl ? "Trợ lý tư vấn học tập" : "Kết nối với trung tâm"}</p></div><button ref={closeButton} type="button" aria-label="Thu nhỏ hỗ trợ" onClick={close}><X size={20} aria-hidden="true" /></button></div>
        {chatUrl ? <>
          {!ready && !slow && <p role="status" className={styles.loading}><LoaderCircle size={18} className="animate-spin" aria-hidden="true" /> Đang tải khung tư vấn…</p>}
          {slow && <div className={styles.fallback} role="status"><p>Khung chat tải chậm hoặc chưa kết nối được. Bạn có thể thử lại hoặc liên hệ WEWIN bên dưới.</p><button type="button" onClick={reload}><RotateCcw size={16} aria-hidden="true" /> Tải lại chat</button></div>}
          {allowed && loaded && <iframe key={retry} src={chatUrl} title="Trợ lý tư vấn WEWIN VSTEP — FastBots" className={styles.frame} allow="clipboard-write" referrerPolicy="strict-origin-when-cross-origin" onLoad={() => { setReady(true); }} onError={() => setSlow(true)} />}
          <div className={styles.directLinks}><a href="https://zalo.me/0345969388" target="_blank" rel="noopener noreferrer">Nhắn Zalo <ExternalLink size={13} aria-hidden="true" /></a><a href="tel:+84345969388">Gọi WEWIN</a></div>
        </> : <div className={styles.contact}><MessageCircle size={32} aria-hidden="true" /><h3>Bạn cần WEWIN giúp gì?</h3><p>Liên hệ trung tâm để được tư vấn chương trình VSTEP, cấp tài khoản hoặc hỗ trợ khi học.</p><a href="https://zalo.me/0345969388" target="_blank" rel="noopener noreferrer" className={styles.zalo}>Nhắn WEWIN qua Zalo <ExternalLink size={16} aria-hidden="true" /></a><a href="tel:+84345969388"><Phone size={18} aria-hidden="true" />0345 969 388</a><a href="mailto:officemanager@wewin.edu.vn"><Mail size={18} aria-hidden="true" />officemanager@wewin.edu.vn</a></div>}
      </div>
    </dialog>
  </>;
}
