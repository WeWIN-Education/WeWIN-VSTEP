import { getAuthState } from "@/lib/access";
import { EXAM_PROGRAMS, type ExamProgram } from "@/lib/exam-config";
import { fixtureFromRecord } from "@/lib/vstep-paper";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import { ArrowRight, BarChart3, BookOpen, Clock3, FileText, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

type CatalogCode = "FULL" | "LISTENING" | "READING" | "WRITING" | "SPEAKING";
const catalogs: Array<{ code: CatalogCode; label: string; description: string }> = [
  { code: "FULL", label: "Luyện đề", description: "Làm trọn bài VSTEP theo thứ tự bốn kỹ năng." },
  { code: "LISTENING", label: "Kho Listening", description: "Tập trung vào phần Nghe và audio của từng đề." },
  { code: "READING", label: "Kho Reading", description: "Tập trung vào phần Đọc và các passage của đề." },
  { code: "WRITING", label: "Kho Writing", description: "Luyện hai nhiệm vụ Viết theo từng bộ đề." },
  { code: "SPEAKING", label: "Kho Speaking", description: "Luyện ba phần Nói và lưu bản ghi theo lượt." },
];

function readCatalog(value: string | string[] | undefined): CatalogCode {
  const normalized = Array.isArray(value) ? value[0] : value;
  return catalogs.some((item) => item.code === normalized) ? normalized as CatalogCode : "FULL";
}

export async function generateMetadata({ params }: { params: Promise<{ level: string }> }): Promise<Metadata> {
  const { level } = await params;
  return level === "vstep" ? { title: "Luyện thi VSTEP | WEWIN EDUCATION" } : { title: "Luyện thi | WEWIN EDUCATION" };
}

export default async function ExamHubPage({ params, searchParams }: { params: Promise<{ level: string }>; searchParams: Promise<{ catalog?: string | string[] }> }) {
  const [{ level }, filters] = await Promise.all([params, searchParams]);
  if (level !== "vstep") notFound();
  const program: ExamProgram = "vstep";
  const catalog = readCatalog(filters.catalog);
  const config = EXAM_PROGRAMS[program];
  const authState = await getAuthState();
  if (authState.kind === "invalid") redirect(`/login?callbackUrl=${encodeURIComponent(`/exam/${level}`)}`);
  const access = authState.kind === "authenticated" ? authState.user.role === "ADMIN" ? "admin" : "learner" : "guest";
  const statuses = access === "admin" ? ["READY", "SAMPLE", "PUBLISHED"] : ["PUBLISHED"];
  const stored = await prisma.examPaper.findMany({ where: { programme: "VSTEP", status: { in: statuses as ("READY" | "SAMPLE" | "PUBLISHED")[] } }, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
  const exams = stored.map((record) => ({ fixture: fixtureFromRecord(record), status: record.status })).filter((item): item is { fixture: NonNullable<ReturnType<typeof fixtureFromRecord>>; status: "READY" | "SAMPLE" | "PUBLISHED" } => Boolean(item.fixture));
  const stats = authState.kind === "authenticated" ? await prisma.examAttempt.count({ where: { userId: authState.user.id, catalog, examPaper: { programme: "VSTEP" }, status: "SUBMITTED" } }) : null;
  const activeCatalog = catalogs.find((item) => item.code === catalog)!;
  const activeSkillLabel = activeCatalog.label.replace(/^Kho\s+/i, "");
  const progress = stats === null ? null : exams.length ? Math.min(100, Math.round((stats / exams.length) * 100)) : 0;

  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <PageHero eyebrow={config.eyebrow} title="Luyện thi VSTEP" description="Một bộ đề được nhập một lần sẽ có bản Full Test và bốn kho kỹ năng riêng, cùng lưu lịch sử theo tài khoản." />
        <Card padding="lg" className="flex flex-col justify-between">
          <div><p className="text-xs font-bold text-ink-muted">{activeCatalog.label}</p><p className="mt-2 text-2xl font-extrabold text-brand">{progress === null ? "Học thử" : `${progress}%`}</p><p className="mt-1 text-sm leading-relaxed text-ink-muted">{progress === null ? "Guest được làm tối đa 2 đề khác nhau trong mỗi kho. Mỗi đề chỉ dùng một lượt." : stats ? `${stats} lượt đã nộp trong kho này.` : activeCatalog.description}</p></div>
          {exams[0] ? <Link href={`/exam/vstep/${exams[0].fixture.slug}?catalog=${catalog}`} className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-btn)] bg-brand px-4 text-sm font-extrabold text-white transition hover:bg-brand-dark">{progress === null ? "Học thử ngay" : "Mở đề đầu tiên"}<ArrowRight className="size-4" /></Link> : <span className="mt-4 flex min-h-11 items-center justify-center rounded-[var(--radius-btn)] border border-border bg-surface px-4 text-sm font-bold text-ink-muted">Chưa có đề mở</span>}
        </Card>
      </div>

      <nav className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-5" aria-label="Kho đề VSTEP">
        {catalogs.map((item) => <Link key={item.code} href={`/exam/vstep?catalog=${item.code}`} aria-current={item.code === catalog ? "page" : undefined} className={`flex min-h-12 items-center justify-center rounded-2xl border px-3 text-center text-sm font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${item.code === catalog ? "border-brand bg-brand text-white" : "border-border bg-white text-ink-muted hover:border-brand/40 hover:text-brand"}`}>{item.label}</Link>)}
      </nav>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-[family-name:var(--font-jakarta)] text-xl font-extrabold text-ink">{activeCatalog.label}</h2><p className="mt-1 text-sm text-ink-muted">{activeCatalog.description}</p></div><span className="rounded-full bg-[#ECFBF3] px-3 py-1 text-xs font-bold text-[#1F7A4D]">{exams.length} đề sẵn sàng</span></div>
          <div className="space-y-3">
            {exams.map(({ fixture: exam, status }) => <Card key={exam.slug} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand"><FileText className="size-5" /></span><div className="min-w-0"><div className="flex flex-wrap gap-2"><span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-extrabold uppercase text-brand">{exam.target}</span><span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold text-ink-muted">{exam.duration}</span>{status !== "PUBLISHED" ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">Chỉ admin xem</span> : null}</div><h3 className="mt-1 truncate font-[family-name:var(--font-jakarta)] text-[15px] font-extrabold text-ink">{exam.title}</h3><p className="mt-1 text-xs text-ink-muted">{catalog === "FULL" ? exam.subtitle : `Bài luyện VSTEP kỹ năng ${activeSkillLabel}`}</p></div></div><Link href={`/exam/vstep/${exam.slug}?catalog=${catalog}`} className="shrink-0"><span className="flex min-h-10 items-center justify-center gap-1 rounded-[var(--radius-btn)] border border-brand px-4 text-sm font-extrabold text-brand transition hover:bg-brand hover:text-white">{access === "guest" ? "Học thử" : "Làm bài"}<ArrowRight className="size-4" /></span></Link></Card>)}
            {!exams.length ? <Card className="flex items-center gap-3 border-dashed bg-surface p-5"><span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-ink-faint"><LockKeyhole className="size-5" /></span><div><h3 className="font-[family-name:var(--font-jakarta)] text-[15px] font-extrabold text-ink">Chưa có đề đã xuất bản</h3><p className="mt-1 text-sm text-ink-muted">Admin cần nhập và kiểm tra đủ DOCX, đáp án và audio trước khi mở kho này.</p></div></Card> : null}
          </div>
        </section>
        <aside className="space-y-4"><Card padding="lg"><div className="flex items-center gap-2"><BarChart3 className="size-5 text-brand" /><h3 className="font-[family-name:var(--font-jakarta)] text-sm font-bold text-ink">Tiến độ</h3></div><p className="mt-3 text-sm leading-relaxed text-ink-muted">{progress === null ? "Đăng nhập để lưu bài làm, xem lịch sử và dùng bookmark câu hỏi." : progress ? "Tiến độ tính từ các lượt đã nộp trong kho đang chọn." : "Bạn chưa nộp đề nào trong kho này."}</p></Card><Card padding="lg"><div className="flex items-center gap-2"><Clock3 className="size-5 text-[#D4A017]" /><h3 className="font-[family-name:var(--font-jakarta)] text-sm font-bold text-ink">Cách luyện</h3></div><ol className="mt-3 list-decimal space-y-2 pl-4 text-sm leading-relaxed text-ink-muted"><li>Chọn đúng kho theo mục tiêu hôm nay.</li><li>Lưu câu cần xem lại bằng ngôi sao.</li><li>Mở lịch sử để xem điểm và câu trả lời.</li></ol></Card><Card padding="lg" className="bg-brand-soft/45"><BookOpen className="size-5 text-brand" /><p className="mt-3 text-sm font-extrabold text-ink">Một paper, năm cách học</p><p className="mt-1 text-sm leading-relaxed text-ink-muted">Full Test và từng kỹ năng có lượt làm, điểm và review độc lập.</p></Card></aside>
      </div>
    </div>
  );
}
