import { LeaderboardCard } from "@/components/gamification/LeaderboardCard";
import { DailyChallenges } from "@/components/gamification/DailyChallenges";
import { VstepProgressCard } from "@/components/gamification/VstepProgressCard";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import { getCurrentUser } from "@/lib/access";
import { getGamificationSummary, getLeaderboard } from "@/lib/gamification";
import { prisma } from "@/lib/prisma";
import { ArrowRight, BookOpen, CheckCircle2, Clock3, FileText, Headphones, PenLine, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Tổng quan | WEWIN EDUCATION" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");

  const [attempts, submitted, publishedPapers, vocabularyDue, gamification, leaderboard, inProgress, completedPapers, latestInProgress] = await Promise.all([
    prisma.examAttempt.findMany({
      where: { userId: user.id },
      include: { examPaper: { select: { title: true, slug: true, programme: true } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.examAttempt.count({ where: { userId: user.id, status: "SUBMITTED" } }),
    prisma.examPaper.count({ where: { programme: "VSTEP", status: "PUBLISHED" } }),
    prisma.vocabularyProgress.count({ where: { userId: user.id, status: { in: ["NEW", "LEARNING"] } } }),
    getGamificationSummary(user.id),
    getLeaderboard(user.id),
    prisma.examAttempt.count({ where: { userId: user.id, status: "IN_PROGRESS" } }),
    prisma.examPaper.count({ where: { programme: "VSTEP", status: "PUBLISHED", attempts: { some: { userId: user.id, status: "SUBMITTED", catalog: "FULL" } } } }),
    prisma.examAttempt.findFirst({
      where: { userId: user.id, status: "IN_PROGRESS" },
      orderBy: { updatedAt: "desc" },
      include: { examPaper: { select: { title: true, slug: true, programme: true } } },
    }),
  ]);
  const submittedInProgress = latestInProgress;
  const progress = publishedPapers ? Math.round((completedPapers / publishedPapers) * 100) : 0;
  const firstName = user.name?.trim().split(/\s+/).at(-1) || "bạn";
  const nextHref = submittedInProgress ? `/exam/${submittedInProgress.examPaper.programme.toLowerCase()}/${submittedInProgress.examPaper.slug}?catalog=${submittedInProgress.catalog}&attempt=${submittedInProgress.id}` : "/exam/vstep";

  return (
    <div className="mx-auto max-w-[1180px] space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-ink-muted">Không gian học tập · {user.role === "ADMIN" ? "Quản trị viên" : "Giáo viên"}</p>
          <h1 className="mt-1 font-[family-name:var(--font-jakarta)] text-3xl font-extrabold text-ink">Xin chào, {firstName}</h1>
        </div>
        {user.role === "ADMIN" ? <Link href="/manage/users" className="hidden items-center gap-2 rounded-full bg-brand-soft px-3 py-2 text-xs font-extrabold text-brand sm:inline-flex"><ShieldCheck className="size-4" aria-hidden="true" />Khu quản trị</Link> : null}
      </div>

      <PageHero
        eyebrow={submittedInProgress ? "TIẾP TỤC BÀI ĐANG LÀM" : "BẮT ĐẦU PHIÊN HỌC"}
        title={submittedInProgress ? submittedInProgress.examPaper.title : "Chọn một đề để bắt đầu"}
        description={submittedInProgress ? "Bài làm đang được lưu theo tài khoản của bạn." : "Làm đề VSTEP hoặc mở một nội dung Classroom English đã xuất bản."}
        aside={<Link href={nextHref} className="flex h-10 items-center justify-center rounded-[var(--radius-btn)] bg-brand px-5 text-sm font-extrabold text-white">{submittedInProgress ? "Tiếp tục" : "Mở chương trình"}<ArrowRight className="ml-2 size-4" aria-hidden="true" /></Link>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={<Clock3 />} label="Bài đang làm" value={String(inProgress)} />
        <Stat icon={<CheckCircle2 />} label="Bài đã nộp" value={String(submitted)} tone="green" />
        <Stat icon={<FileText />} label="Tiến độ đề đầy đủ" value={`${progress}%`} detail={publishedPapers ? `${completedPapers}/${publishedPapers} đề khác nhau đã nộp đủ bài` : "Chưa có đề"} tone="gold" />
        <Stat icon={<PenLine />} label="Từ vựng cần ôn" value={String(vocabularyDue)} detail="Từ mới và đang học" tone="orange" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <VstepProgressCard summary={gamification} />
        <DailyChallenges key={user.id} />
      </div>
      <LeaderboardCard data={leaderboard} />

      <div className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
        <Card padding="lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-[family-name:var(--font-jakarta)] text-xl font-extrabold text-ink">Hoạt động gần đây</h2>
            </div>
            <Link href="/history" className="text-xs font-bold text-brand">Mở danh sách →</Link>
          </div>
          {attempts.length ? <div className="mt-5 space-y-3">{attempts.map((attempt) => <Link key={attempt.id} href={`/history/${attempt.id}`} className="flex items-center gap-3 rounded-2xl border border-border p-3 transition hover:border-brand/35"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><FileText className="size-4" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-ink">{attempt.examPaper.title}</span><span className="mt-1 block text-xs text-ink-muted">{attempt.status === "SUBMITTED" ? "Đã nộp" : "Đang làm"} · {new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(attempt.updatedAt)}</span></span><ArrowRight className="size-4 text-brand" aria-hidden="true" /></Link>)}</div> : <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface px-5 py-8 text-center"><p className="text-sm font-extrabold text-ink">Chưa có hoạt động</p><p className="mt-1 text-sm text-ink-muted">Bắt đầu một đề để hệ thống lưu tiến độ cho bạn.</p></div>}
        </Card>
        <Card padding="lg">
          <h2 className="font-[family-name:var(--font-jakarta)] text-xl font-extrabold text-ink">Mở nhanh</h2>
          <div className="mt-5 space-y-3">
            <Task href="/exam/vstep" icon={<BookOpen />} title="Luyện thi VSTEP" detail="Bốn kỹ năng · đề đã xuất bản" />
            <Task href="/video" icon={<Headphones />} title="Classroom English" detail="Video và transcript Anh–Việt" />
            <Task href="/vocabulary/notebook" icon={<PenLine />} title="Sổ tay từ vựng" detail={`${vocabularyDue} mục cần ôn`} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, detail, tone = "blue" }: { icon: ReactNode; label: string; value: string; detail?: string; tone?: "blue" | "green" | "gold" | "orange" }) {
  const colors = { blue: "bg-brand-soft text-brand", green: "bg-[#ECFBF3] text-[#1F7A4D]", gold: "bg-[#FDF3E3] text-[#9A6B2F]", orange: "bg-[#FFF0EF] text-[#B42318]" };
  return <Card className="p-4"><span className={`flex size-10 items-center justify-center rounded-xl ${colors[tone]}`}>{icon}</span><p className="mt-4 text-2xl font-extrabold text-ink">{value}</p><p className="mt-1 text-sm font-semibold text-ink">{label}</p>{detail ? <p className="text-xs text-ink-muted">{detail}</p> : null}</Card>;
}

function Task({ href, icon, title, detail }: { href: string; icon: ReactNode; title: string; detail: string }) {
  return <Link href={href} className="flex items-center gap-3 rounded-2xl border border-border p-3 transition hover:border-brand/35"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">{icon}</span><span className="min-w-0 flex-1"><span className="block text-sm font-bold text-ink">{title}</span><span className="mt-1 block text-xs text-ink-muted">{detail}</span></span><ArrowRight className="size-4 text-brand" aria-hidden="true" /></Link>;
}
