import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import { ArrowRight, BookOpen, Headphones, Mic2, PenLine, PlayCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WEWIN Education | English LMS for Teachers",
  description: "Luyện VSTEP và Classroom English dành cho giáo viên Việt Nam.",
};

const programmes = [
  { href: "/exam/vstep", label: "VSTEP", title: "Luyện thi VSTEP", text: "Luyện đủ Listening, Reading, Writing và Speaking theo cấu trúc VSTEP.3–5.", tone: "bg-[#ECFBF3] text-[#1F7A4D]" },
  { href: "/video", label: "CLASSROOM ENGLISH", title: "Học tiếng Anh qua video", text: "Nghe và luyện lại những câu giáo viên có thể dùng trong lớp học ngay ngày mai.", tone: "bg-[#EEF4FF] text-brand" },
];

export default function HomePage() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-[1180px] space-y-6">
      <PageHero
        eyebrow="WEWIN EDUCATION · DÀNH CHO GIÁO VIÊN"
        title="Tiếng Anh tự tin hơn trong mỗi giờ dạy"
        description="Một không gian học tập tập trung vào VSTEP và những câu tiếng Anh dùng trong lớp học. Khách có thể luyện trọn vẹn các đề VSTEP học thử; tài khoản WEWIN giúp lưu toàn bộ tiến độ."
        aside={<div className="hidden min-w-[210px] items-center justify-center rounded-3xl bg-white/60 p-5 md:flex"><Image src="/brand/mascot-right-clear.png" alt="" width={144} height={144} className="h-36 w-36 object-contain" /></div>}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {programmes.map((programme) => (
          <Link key={programme.href} href={programme.href} className="block min-w-0">
            <Card className="group h-full p-5 transition hover:-translate-y-0.5 hover:border-brand/40">
              <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold ${programme.tone}`}>{programme.label}</span>
              <h2 className="mt-4 font-[family-name:var(--font-jakarta)] text-lg font-extrabold text-ink">{programme.title}</h2>
              <p className="mt-2 min-h-12 text-sm leading-relaxed text-ink-muted">{programme.text}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-brand">Mở chương trình <ArrowRight className="size-4 transition group-hover:translate-x-1" /></span>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
        <Card padding="lg">
          <div className="flex items-center justify-between gap-4"><div><p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-brand">BẮT ĐẦU NHANH</p><h2 className="mt-2 font-[family-name:var(--font-jakarta)] text-xl font-extrabold text-ink">Chọn đúng kỹ năng cho tuần này</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">Bạn có thể học từng kỹ năng riêng, làm bài tập ngắn hoặc mở một đề mẫu hoàn chỉnh.</p></div><BookOpen className="hidden size-12 text-brand/25 sm:block" strokeWidth={1.25} /></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            {([[Headphones, "Listening", "/listening"], [Mic2, "Speaking", "/speaking"], [BookOpen, "Reading", "/training"], [PenLine, "Writing", "/training"]] as const).map(([Icon, label, href]) => <Link key={label} href={href} className="rounded-2xl border border-border p-3 transition hover:border-brand/35 hover:bg-brand-soft"><Icon className="size-5 text-brand" strokeWidth={1.7} /><p className="mt-3 text-sm font-bold text-ink">{label}</p></Link>)}
          </div>
        </Card>

        <Card padding="lg" className="bg-brand text-white"><PlayCircle className="size-9 text-white/80" strokeWidth={1.5} /><h2 className="mt-4 font-[family-name:var(--font-jakarta)] text-xl font-extrabold">Bắt đầu theo cách của bạn</h2><p className="mt-2 text-sm leading-relaxed text-blue-100">Luyện thử VSTEP Test 1–2 ngay hoặc đăng nhập để lưu tiến độ học tập.</p><div className="mt-5 grid gap-2"><Link href="/exam/vstep" className="block"><Button className="w-full border-white bg-white text-brand hover:bg-blue-50">Học thử VSTEP</Button></Link><Link href="/login" className="block"><span className="flex min-h-10 items-center justify-center rounded-[var(--radius-btn)] border border-white/60 px-4 text-sm font-bold text-white hover:bg-white/10">Đăng nhập tài khoản</span></Link></div></Card>
      </div>

      <SiteFooter />
    </div>
  );
}
