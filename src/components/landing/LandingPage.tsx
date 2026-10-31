import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Check, FileText, Headphones, Layers3, Mic, PenLine, Play, ShieldCheck, Sparkles } from "lucide-react";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { LandingHeader } from "./LandingHeader";
import { LandingMotion } from "./LandingMotion";
import { OpenChatButton } from "@/components/chat/OpenChatButton";
import styles from "./landing.module.css";

const skills = [
  { name: "Listening", label: "Nghe để hiểu", icon: Headphones, text: "Làm quen câu hỏi nghe, luyện bắt ý chính và nghe thông tin chi tiết.", href: "/exam/vstep?catalog=LISTENING", mascot: "listening" },
  { name: "Reading", label: "Đọc có chiến lược", icon: BookOpen, text: "Luyện đọc hiểu, tìm thông tin và kiểm tra đáp án sau khi nộp bài.", href: "/exam/vstep?catalog=READING", mascot: "reading" },
  { name: "Writing", label: "Viết rõ ý hơn", icon: PenLine, text: "Luyện viết theo đề VSTEP, xem điểm và nhận xét khi chấm bài hoàn tất.", href: "/exam/vstep?catalog=WRITING", mascot: "writing" },
  { name: "Speaking", label: "Nói tự tin hơn", icon: Mic, text: "Ghi âm câu trả lời, luyện diễn đạt và xem nhận xét cho phần nói.", href: "/exam/vstep?catalog=SPEAKING", mascot: "speaking" },
];

export function LandingPage({ loggedIn }: { loggedIn: boolean }) {
  return <LandingMotion>
    <a className={styles.skip} href="#noi-dung">Đi đến nội dung</a>
    <LandingHeader loggedIn={loggedIn} />
    <main id="noi-dung" tabIndex={-1} className={styles.main}>
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={`${styles.container} ${styles.heroGrid}`}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><span className={styles.dot} /> WEWIN EDUCATION · LUYỆN THI VSTEP</p>
            <h1 id="hero-title">Mỗi ngày một bước.<br /><span>Tự tin vào kỳ thi.</span></h1>
            <p className={styles.heroDescription}>Từ những từ vựng đầu tiên đến bài thi trọn vẹn. Luyện Nghe, Đọc, Viết, Nói trong một không gian học tập của riêng bạn.</p>
            <div className={styles.ctas}>
              <Link href={loggedIn ? "/dashboard" : "/exam/vstep"} className={styles.primary}>{loggedIn ? "Tiếp tục học" : "Học thử VSTEP"}<ArrowRight size={18} aria-hidden="true" /></Link>
              <a href="#cach-hoc" className={styles.secondary}>Khám phá cách học <span aria-hidden="true">↗</span></a>
            </div>
            <p className={styles.heroNote}><ShieldCheck size={17} aria-hidden="true" /> Có thể học thử khi chưa có tài khoản.</p>
            <div className={styles.heroFacts}>
              <div><strong>04</strong><span>Kỹ năng cùng luyện</span></div>
              <div><strong>B1–C1</strong><span>Mục tiêu VSTEP.3–5</span></div>
              <div><strong>Mỗi ngày</strong><span>Một chút tiến bộ</span></div>
            </div>
          </div>
          <div className={styles.heroArt}>
            <div className={styles.orbit} aria-hidden="true" />
            <span className={styles.artCaption}>YOUR NEXT CHAPTER STARTS HERE</span>
            <Image src="/brand/mascots/confident.webp" alt="Linh vật WEWIN đồng hành cùng bạn luyện thi VSTEP" width={768} height={768} sizes="(max-width: 767px) 280px, (max-width: 1023px) 350px, 470px" priority className={styles.heroMascot} />
            <div className={styles.artCard}><span className={styles.cardIcon}><Check size={20} aria-hidden="true" /></span><div><strong>Mục tiêu hôm nay</strong><span>Học một chút. Tiến thêm một bước.</span></div></div>
            <div className={styles.artTag}><Sparkles size={16} aria-hidden="true" /> Sẵn sàng cho VSTEP</div>
          </div>
        </div>
      </section>

      <section id="cach-hoc" className={`${styles.container} ${styles.section}`} aria-labelledby="how-title">
        <div data-reveal className={styles.sectionHeading}><p className={styles.eyebrow}>HỌC CÓ ĐỊNH HƯỚNG</p><h2 id="how-title">Không cần học tất cả.<br />Bắt đầu từ điều bạn cần.</h2><p>Một bài luyện để biết mình đang ở đâu. Một mục tiêu nhỏ để biết hôm nay cần làm gì.</p></div>
        <div className={styles.steps}>
          {[
            ["01", "Thử sức với một bài thi", "Mở đề VSTEP hoặc chọn từng kỹ năng để làm quen với cách hỏi và thời gian làm bài."],
            ["02", "Hiểu bài làm của mình", "Xem đáp án, kết quả và nhận xét bài Viết, bài Nói để nhận ra phần cần luyện thêm."],
            ["03", "Duy trì nhịp học mỗi ngày", "Ôn flashcard, xem một video, hoàn thành nhiệm vụ. Đăng nhập để lưu tiến độ và tích XP."],
          ].map(([number, title, text], index) => <article key={number} data-reveal data-reveal-order={index} className={styles.step}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}
        </div>
      </section>

      <section id="ky-nang" className={styles.skillsSection} aria-labelledby="skills-title">
        <div className={styles.container}>
          <div data-reveal className={styles.splitHeading}><div><p className={styles.eyebrow}>MỘT MỤC TIÊU · BỐN KỸ NĂNG</p><h2 id="skills-title">Luyện từng phần.<br />Sẵn sàng cho cả bài thi.</h2></div><Link className={styles.textLink} href="/exam/vstep">Khám phá kho đề <ArrowRight size={18} aria-hidden="true" /></Link></div>
          <div className={styles.skillGrid}>
            {skills.map(({ name, label, text, icon: Icon, href, mascot }, index) => <Link key={name} href={href} data-reveal data-reveal-order={index} className={styles.skillCard}>
              <div className={styles.skillArt}><Image src={`/brand/skills-v2/${mascot}.webp`} alt={`Linh vật WEWIN luyện ${name}`} width={960} height={640} sizes="(max-width: 639px) calc(100vw - 36px), (max-width: 1023px) 44vw, 286px" /><span><Icon size={20} aria-hidden="true" /></span></div>
              <div className={styles.skillBody}><span>{name}</span><h3>{label}</h3><p>{text}</p><span className={styles.textLink}>Luyện ngay <ArrowRight size={17} aria-hidden="true" /></span></div>
            </Link>)}
          </div>
        </div>
      </section>

      <section className={`${styles.container} ${styles.section}`} aria-labelledby="tools-title">
        <div data-reveal className={styles.sectionHeading}><p className={styles.eyebrow}>THÊM CÁCH HỌC, THÊM HỨNG THÚ</p><h2 id="tools-title">Bên cạnh những bộ đề,<br />còn cả một không gian để luyện tập.</h2></div>
        <div className={styles.featureGrid}>
          <Link href="/vocabulary/topics" data-reveal className={styles.vocabularyCard}><div className={styles.featureCopy}><Layers3 size={28} aria-hidden="true" /><h3>Từ mới hôm nay.<br />Vốn từ cho ngày mai.</h3><p>Khám phá từ vựng theo chủ đề, xem nghĩa và IPA, lật flashcard để ôn lại.</p><span className={styles.textLink}>Mở bộ từ vựng <ArrowRight size={17} aria-hidden="true" /></span></div><div className={styles.flashcardPreview} aria-hidden="true"><span>WORD OF THE DAY</span><strong>progress</strong><em>/ˈprəʊ.ɡres/</em><div /><p>sự tiến bộ</p><span>Mỗi ngày một chút.</span></div></Link>
          <Link href="/video" data-reveal data-reveal-order="1" className={styles.videoCard}><div className={styles.videoVisual}><Image src="/brand/mascots/focused.webp" alt="" width={220} height={220} sizes="180px" /><span><Play size={22} fill="currentColor" aria-hidden="true" /></span></div><div className={styles.featureCopy}><h3>Nghe thật. Hiểu từng câu.</h3><p>Học qua video với transcript, phiên âm và nghĩa tiếng Việt đi cùng nội dung bài học.</p><span className={styles.textLink}>Khám phá video <ArrowRight size={17} aria-hidden="true" /></span></div></Link>
        </div>
      </section>

      <section className={`${styles.container} ${styles.feedbackSection}`} aria-labelledby="feedback-title"><div data-reveal className={styles.feedbackCopy}><p className={styles.eyebrow}>HỌC TỪ CHÍNH BÀI LÀM CỦA BẠN</p><h2 id="feedback-title">Làm bài là khởi đầu.<br />Hiểu cách cải thiện mới là bước tiếp theo.</h2><p>Bài Viết và bài Nói được gửi đến dịch vụ chấm bài. Khi có kết quả, bạn có thể xem điểm, đọc nhận xét và quay lại luyện tập.</p><Link href="/exam/vstep" className={styles.goldButton}>Bắt đầu một bài luyện <ArrowRight size={18} aria-hidden="true" /></Link><small>Kết quả dùng để tham khảo khi ôn luyện, không thay thế chứng chỉ VSTEP.</small></div><div className={styles.feedbackCards}><div data-reveal><PenLine size={22} aria-hidden="true" /><h3>Writing</h3><p>Lưu bài viết, xem đánh giá và góp ý cho bài làm.</p></div><div data-reveal data-reveal-order="1"><Mic size={22} aria-hidden="true" /><h3>Speaking</h3><p>Ghi âm bài nói, nghe lại và xem nhận xét khi có kết quả.</p></div><div data-reveal data-reveal-order="2" className={styles.feedbackHint}><FileText size={19} aria-hidden="true" /> Nhận xét gắn với bài bạn đã nộp.</div></div></section>

      <section id="ho-tro" data-reveal className={`${styles.container} ${styles.support}`} aria-labelledby="support-title"><div><p className={styles.eyebrow}>WEWIN LUÔN SẴN SÀNG HỖ TRỢ</p><h2 id="support-title">Chưa biết bắt đầu từ đâu?</h2><p>Trao đổi với WEWIN về chương trình VSTEP, tài khoản học hoặc cách sử dụng nền tảng.</p></div><div className={styles.supportActions}><OpenChatButton className={styles.primary}>Tư vấn & hỗ trợ <ArrowRight size={18} aria-hidden="true" /></OpenChatButton><a href="tel:+84345969388" className={styles.secondary}>Gọi 0345 969 388</a></div></section>
    </main>
    <div data-reveal className={`${styles.container} ${styles.footer}`}><SiteFooter /></div>
  </LandingMotion>;
}
