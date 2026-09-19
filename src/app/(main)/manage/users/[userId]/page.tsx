import { Card } from "@/components/ui/Card";
import { LinkifiedText } from "@/components/ui/LinkifiedText";
import { PageHero } from "@/components/ui/PageHero";
import { getCurrentUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { ArrowLeft, Bookmark, FileText, MessageSquareText, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

const tabs = [
  ["overview", "Tổng quan"],
  ["attempts", "Lịch sử bài làm"],
  ["progress", "Tiến độ"],
  ["posts", "Bài viết"],
  ["bookmarks", "Sổ sao"],
] as const;

const catalogs = ["FULL", "LISTENING", "READING", "WRITING", "SPEAKING"] as const;

const attemptSelect = {
  id: true,
  catalog: true,
  skill: true,
  status: true,
  listeningScore: true,
  readingScore: true,
  writingStatus: true,
  speakingStatus: true,
  startedAt: true,
  updatedAt: true,
  examPaper: { select: { title: true, programme: true, slug: true } },
  paperPart: { select: { title: true } },
} satisfies Prisma.ExamAttemptSelect;

const bookmarkSelect = {
  id: true,
  catalog: true,
  questionId: true,
  note: true,
  createdAt: true,
  examPaper: { select: { title: true, slug: true } },
  paperPart: { select: { title: true } },
} satisfies Prisma.QuestionBookmarkSelect;

type UserAttempt = Prisma.ExamAttemptGetPayload<{ select: typeof attemptSelect }>;
type UserBookmark = Prisma.QuestionBookmarkGetPayload<{ select: typeof bookmarkSelect }>;

function label(value: string) {
  return value === "FULL" ? "Full Test" : value[0] + value.slice(1).toLowerCase();
}

function date(value: Date) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

export default async function ManageUserProfilePage({ params, searchParams }: { params: Promise<{ userId: string }>; searchParams: Promise<{ tab?: string | string[] }> }) {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login?callbackUrl=/manage/users");
  if (actor.role !== "ADMIN") redirect("/dashboard");
  const { userId } = await params;
  const rawTab = (await searchParams).tab;
  const tab = (Array.isArray(rawTab) ? rawTab[0] : rawTab) || "overview";
  const activeTab = tabs.some(([key]) => key === tab) ? tab : "overview";

  const user = await prisma.user.findFirst({
    where: { id: userId, role: "LEARNER" },
    select: {
      id: true, name: true, email: true, isActive: true, createdAt: true, updatedAt: true,
      _count: { select: { attempts: true, vocabularyProgress: true, personalVocabulary: true, posts: true, questionBookmarks: true } },
    },
  });
  if (!user) notFound();

  const [attempts, posts, bookmarks] = await Promise.all([
    prisma.examAttempt.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: attemptSelect,
    }),
    prisma.userPost.findMany({ where: { authorId: user.id }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, title: true, body: true, status: true, rejectionReason: true, createdAt: true, publishedAt: true } }),
    prisma.questionBookmark.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 200, select: bookmarkSelect }),
  ]);

  const progress = catalogs.map((catalog) => {
    const items = attempts.filter((attempt) => attempt.catalog === catalog);
    const submitted = items.filter((attempt) => attempt.status === "SUBMITTED");
    return { catalog, total: items.length, submitted: submitted.length, latest: items[0]?.updatedAt || null, listening: submitted.filter((attempt) => typeof attempt.listeningScore === "number").length, reading: submitted.filter((attempt) => typeof attempt.readingScore === "number").length };
  });

  return <div className="mx-auto w-full max-w-[1180px] space-y-6"><Link href="/manage/users" className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-brand hover:underline"><ArrowLeft className="size-4" />Quản lý học viên</Link><PageHero eyebrow="HỒ SƠ NỘI BỘ" title={user.name || "Học viên chưa đặt tên"} description={user.email + " · " + (user.isActive ? "Tài khoản đang hoạt động" : "Tài khoản đã khóa")} stats={[{ label: "Lượt thi", value: String(user._count.attempts) }, { label: "Mục từ đang theo dõi", value: String(user._count.vocabularyProgress) }, { label: "Bài viết", value: String(user._count.posts) }]} /><nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Các tab hồ sơ">{tabs.map(([key, title]) => <Link key={key} href={"/manage/users/" + user.id + "?tab=" + key} aria-current={activeTab === key ? "page" : undefined} className={activeTab === key ? "shrink-0 rounded-xl border border-brand bg-brand px-4 py-2.5 text-sm font-extrabold text-white" : "shrink-0 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-extrabold text-ink-muted hover:border-brand hover:text-brand"}>{title}</Link>)}</nav>{activeTab === "overview" ? <Overview user={user} attempts={attempts} progress={progress} /> : null}{activeTab === "attempts" ? <AttemptList attempts={attempts} /> : null}{activeTab === "progress" ? <ProgressPanel progress={progress} vocabularyCount={user._count.vocabularyProgress} personalCount={user._count.personalVocabulary} /> : null}{activeTab === "posts" ? <PostList posts={posts} /> : null}{activeTab === "bookmarks" ? <BookmarkList bookmarks={bookmarks} /> : null}</div>;
}

function Overview({ user, attempts, progress }: { user: { email: string; createdAt: Date; updatedAt: Date; _count: { personalVocabulary: number; questionBookmarks: number } }; attempts: UserAttempt[]; progress: { catalog: string; total: number; submitted: number }[] }) {
  return <div className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]"><Card padding="lg"><div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand"><UserRound className="size-5" /></span><div><h2 className="text-xl font-extrabold text-ink">Thông tin tài khoản</h2><p className="text-sm text-ink-muted">Không hiển thị mật khẩu hoặc dữ liệu xác thực.</p></div></div><dl className="mt-5 space-y-3 text-sm"><Info label="Email" value={user.email} /><Info label="Ngày cấp tài khoản" value={date(user.createdAt)} /><Info label="Cập nhật gần nhất" value={date(user.updatedAt)} /><Info label="Sổ tay cá nhân" value={String(user._count.personalVocabulary) + " mục"} /><Info label="Câu hỏi đã lưu" value={String(user._count.questionBookmarks) + " câu"} /></dl></Card><Card padding="lg"><h2 className="text-xl font-extrabold text-ink">Hoạt động theo catalog</h2><div className="mt-4 space-y-3">{progress.map((item) => <div key={item.catalog} className="flex items-center justify-between gap-3 rounded-xl bg-surface px-3 py-3"><span className="text-sm font-bold text-ink">{label(item.catalog)}</span><span className="text-xs text-ink-muted">{item.submitted}/{item.total} lượt đã nộp</span></div>)}</div><Link href="?tab=attempts" className="mt-4 inline-flex text-sm font-extrabold text-brand hover:underline">Xem lịch sử đầy đủ →</Link></Card><Card padding="lg" className="lg:col-span-2"><h2 className="text-xl font-extrabold text-ink">Lượt gần đây</h2><div className="mt-4"><AttemptList attempts={attempts.slice(0, 5)} /></div></Card></div>;
}

function Info({ label: title, value }: { label: string; value: string }) {
  return <div className="flex flex-wrap justify-between gap-3 border-b border-border pb-3 last:border-0"><dt className="text-ink-muted">{title}</dt><dd className="text-right font-semibold text-ink">{value}</dd></div>;
}

function AttemptList({ attempts }: { attempts: UserAttempt[] }) {
  return <Card padding="lg"><div className="flex items-center gap-2"><FileText className="size-5 text-brand" /><h2 className="text-xl font-extrabold text-ink">Lịch sử bài làm</h2></div>{attempts.length ? <div className="mt-4 space-y-3">{attempts.map((attempt) => <div key={attempt.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3"><span className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand"><FileText className="size-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold text-ink">{attempt.examPaper.title}</p><p className="mt-1 text-xs text-ink-muted">{attempt.paperPart?.title || "Full Test"} · {label(attempt.catalog)} · {date(attempt.updatedAt)}</p></div><span className={attempt.status === "SUBMITTED" ? "rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700" : "rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800"}>{attempt.status === "SUBMITTED" ? "Đã nộp" : "Đang làm"}</span></div>)}</div> : <p className="mt-4 text-sm text-ink-muted">Chưa có lượt bài làm.</p>}</Card>;
}

function ProgressPanel({ progress, vocabularyCount, personalCount }: { progress: { catalog: string; total: number; submitted: number; latest: Date | null; listening: number; reading: number }[]; vocabularyCount: number; personalCount: number }) {
  return <Card padding="lg"><h2 className="text-xl font-extrabold text-ink">Tiến độ theo chương trình và kỹ năng</h2><p className="mt-1 text-sm text-ink-muted">Số liệu được tổng hợp từ các lượt thi đã lưu của học viên.</p><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead><tr className="border-b border-border text-xs font-extrabold uppercase tracking-wide text-ink-muted"><th className="px-3 py-3">Catalog</th><th className="px-3 py-3">Tổng lượt</th><th className="px-3 py-3">Đã nộp</th><th className="px-3 py-3">Listening</th><th className="px-3 py-3">Reading</th><th className="px-3 py-3">Hoạt động cuối</th></tr></thead><tbody>{progress.map((item) => <tr key={item.catalog} className="border-b border-border/70 last:border-0"><td className="px-3 py-3 font-bold text-ink">{label(item.catalog)}</td><td className="px-3 py-3 text-ink-muted">{item.total}</td><td className="px-3 py-3 text-ink-muted">{item.submitted}</td><td className="px-3 py-3 text-ink-muted">{item.listening}</td><td className="px-3 py-3 text-ink-muted">{item.reading}</td><td className="px-3 py-3 text-xs text-ink-muted">{item.latest ? date(item.latest) : "—"}</td></tr>)}</tbody></table></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-surface p-4"><p className="text-xs font-bold text-ink-muted">Tiến độ từ vựng chung</p><p className="mt-1 text-2xl font-extrabold text-brand">{vocabularyCount}</p></div><div className="rounded-xl bg-surface p-4"><p className="text-xs font-bold text-ink-muted">Mục từ trong Sổ tay cá nhân</p><p className="mt-1 text-2xl font-extrabold text-brand">{personalCount}</p></div></div></Card>;
}

function PostList({ posts }: { posts: Array<{ id: string; title: string | null; body: string; status: string; rejectionReason: string | null; createdAt: Date; publishedAt: Date | null }> }) {
  return <Card padding="lg"><div className="flex items-center gap-2"><MessageSquareText className="size-5 text-brand" /><h2 className="text-xl font-extrabold text-ink">Bài viết của học viên</h2></div>{posts.length ? <div className="mt-4 space-y-3">{posts.map((post) => <article key={post.id} className="rounded-xl border border-border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-extrabold text-ink">{post.title || "Bài viết không tiêu đề"}</h3><span className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-bold text-brand">{post.status}</span></div><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-muted"><LinkifiedText>{post.body}</LinkifiedText></p>{post.rejectionReason ? <p className="mt-2 text-xs text-red-700">Lý do từ chối: <LinkifiedText>{post.rejectionReason}</LinkifiedText></p> : null}<p className="mt-3 text-xs text-ink-faint">{date(post.createdAt)}</p></article>)}</div> : <p className="mt-4 text-sm text-ink-muted">Học viên chưa có bài viết.</p>}</Card>;
}

function BookmarkList({ bookmarks }: { bookmarks: UserBookmark[] }) {
  return <Card padding="lg"><div className="flex items-center gap-2"><Bookmark className="size-5 text-brand" /><h2 className="text-xl font-extrabold text-ink">Câu hỏi đã lưu</h2></div>{bookmarks.length ? <div className="mt-4 space-y-3">{bookmarks.map((item) => <article key={item.id} className="rounded-xl border border-border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-extrabold text-ink">{item.examPaper.title} · Câu {item.questionId}</p><span className="text-xs font-bold text-brand">{label(item.catalog)}</span></div><p className="mt-1 text-xs text-ink-muted">{item.paperPart?.title || "Full Test"} · {date(item.createdAt)}</p>{item.note ? <p className="mt-2 text-sm text-ink-muted">{item.note}</p> : null}</article>)}</div> : <p className="mt-4 text-sm text-ink-muted">Học viên chưa lưu câu hỏi nào.</p>}</Card>;
}
