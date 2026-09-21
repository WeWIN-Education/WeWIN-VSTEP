import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import { ArrowRight, BookOpen, PlayCircle } from "lucide-react";
import { SkillMascot } from "@/components/ui/SkillMascot";
import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/access";

export const metadata: Metadata = {
  title: "WEWIN Education | English LMS for Teachers",
  description: "Luyện VSTEP và Classroom English dành cho giáo viên Việt Nam.",
};

const programmes = [
  { href: "/exam/vstep", label: "VSTEP", title: "Luyện thi VSTEP", text: "Luyện đủ Listening, Reading, Writing và Speaking theo cấu trúc VSTEP.3–5.", tone: "bg-[#ECFBF3] text-[#1F7A4D]" },
  { href: "/video", label: "CLASSROOM ENGLISH", title: "Học tiếng Anh qua video", text: "Nghe và luyện lại những câu giáo viên có thể dùng trong lớp học ngay ngày mai.", tone: "bg-[#EEF4FF] text-brand" },
];

export default async function HomePage() {
  const user = await getCurrentUser();
  return (
    <div className="mx-auto w-full min-w-0 max-w-[1180px] space-y-6">
      <PageHero
        eyebrow="WEWIN EDUCATION · DÀNH CHO GIÁO VIÊN"
        title="Tiếng Anh tự tin hơn trong mỗi giờ dạy"
        description="Luyện VSTEP và Classroom English theo lộ trình rõ ràng. Đăng nhập để lưu tiến độ."
        backgroundSrc="/brand/bg.png"
        className="min-h-[220px] bg-cover bg-left md:bg-center"
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

      <div className={`grid gap-4 ${user ? "" : "lg:grid-cols-[1.35fr_.65fr]"}`}>
        <Card padding="lg">
          <div className="flex items-center justify-between gap-4"><div><p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-brand">BẮT ĐẦU NHANH</p><h2 className="mt-2 font-[family-name:var(--font-jakarta)] text-xl font-extrabold text-ink">Chọn đúng kỹ năng cho tuần này</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">Bạn có thể học từng kỹ năng riêng, làm bài tập ngắn hoặc mở một đề mẫu hoàn chỉnh.</p></div><BookOpen className="hidden size-12 text-brand/25 sm:block" strokeWidth={1.25} /></div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {([["Listening", "/listening"], ["Speaking", "/speaking"], ["Reading", "/training"], ["Writing", "/training"]] as const).map(([label, href]) => (
              <Link key={label} href={href} className="group min-w-0 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-colors hover:border-brand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
                <SkillMascot skill={label} />
                <div className="flex min-h-12 items-center justify-between gap-1 px-3 py-3">
                  <p className="text-sm font-bold text-ink">{label}</p>
                  <PlayCircle className="size-5 shrink-0 text-brand" aria-hidden="true" />
                </div>
              </Link>
            ))}
          </div>
        </Card>

        {!user && <Card padding="lg" className="bg-brand text-white"><PlayCircle className="size-9 text-white/80" strokeWidth={1.5} /><h2 className="mt-4 font-[family-name:var(--font-jakarta)] text-xl font-extrabold">Bắt đầu theo cách của bạn</h2><p className="mt-2 text-sm leading-relaxed text-blue-100">Luyện thử VSTEP Test 1–2 ngay hoặc đăng nhập để lưu tiến độ học tập.</p><div className="mt-5 grid gap-2"><Link href="/exam/vstep" className="block"><Button className="w-full border-white bg-white text-brand hover:bg-blue-50">Học thử VSTEP</Button></Link><Link href="/login" className="block"><span className="flex min-h-10 items-center justify-center rounded-[var(--radius-btn)] border border-white/60 px-4 text-sm font-bold text-white hover:bg-white/10">Đăng nhập tài khoản</span></Link></div></Card>}
      </div>

      <SiteFooter />
    </div>
  );
}
