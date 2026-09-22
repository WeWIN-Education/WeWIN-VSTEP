import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import { getCurrentUser } from "@/lib/access";
import { getHistoryPage, historyCatalogs as catalogs, historySkills as skills } from "@/lib/exam-history";
import { ArrowRight, History as HistoryIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

function label(value: string) { return ({ FULL: "Full Test", LISTENING: "Nghe", READING: "Đọc", WRITING: "Viết", SPEAKING: "Nói" } as Record<string, string>)[value] || value; }

export default async function HistoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/history");
  const page = await getHistoryPage(user.id, await searchParams);
  const { attempts, filters } = page;
  const { catalog, skill, status, paper, from, to } = filters;
  return <div className="mx-auto w-full max-w-[1120px] space-y-6">
    <PageHero eyebrow="TIẾN ĐỘ CÁ NHÂN" title="Lịch sử bài làm" description="Xem điểm, đáp án và nhận xét các bài đã làm." stats={[
      { label: "Lượt hiển thị", value: String(attempts.length) },
      { label: "Đã nộp trong trang", value: String(attempts.filter(attempt => attempt.status === "SUBMITTED").length) },
    ]} />
    <Card padding="md">
      <form key={JSON.stringify(filters)} action="/history" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6" method="get">
        <select name="catalog" defaultValue={catalog || ""} aria-label="Lọc dạng bài" className="h-11 rounded-xl border border-border bg-white px-3 text-sm"><option value="">Tất cả dạng bài</option>{catalogs.map(item => <option key={item} value={item}>{label(item)}</option>)}</select>
        <select name="skill" defaultValue={skill || ""} aria-label="Lọc kỹ năng" className="h-11 rounded-xl border border-border bg-white px-3 text-sm"><option value="">Tất cả kỹ năng</option>{skills.map(item => <option key={item} value={item}>{label(item)}</option>)}</select>
        <select name="status" defaultValue={status || ""} aria-label="Lọc trạng thái" className="h-11 rounded-xl border border-border bg-white px-3 text-sm"><option value="">Mọi trạng thái</option><option value="IN_PROGRESS">Đang làm</option><option value="SUBMITTED">Đã nộp</option></select>
        <input name="paper" defaultValue={paper} placeholder="Tên đề" aria-label="Tên đề" className="h-11 rounded-xl border border-border px-3 text-sm outline-none focus:border-brand" />
        <input name="from" type="date" defaultValue={from} aria-label="Từ ngày" aria-describedby="history-dates" className="h-11 rounded-xl border border-border px-3 text-sm" />
        <input name="to" type="date" defaultValue={to} aria-label="Đến ngày" aria-describedby="history-dates" className="h-11 rounded-xl border border-border px-3 text-sm" />
        <p id="history-dates" className="text-xs text-ink-muted sm:col-span-2 lg:col-span-6">Ngày cập nhật và bộ lọc dùng múi giờ UTC.</p>
        <button className="min-h-11 rounded-[var(--radius-btn)] bg-brand px-4 text-sm font-extrabold text-white sm:col-span-2 lg:col-span-6 lg:justify-self-start" type="submit">Lọc lịch sử</button>
      </form>
      {page.error && <p role="alert" className="mt-3 text-sm text-red-700">{page.error}</p>}
    </Card>
    <section className="space-y-3" aria-label="Các lượt làm bài">
      {attempts.length ? attempts.map(attempt => <Link key={attempt.id} href={`/history/${attempt.id}`} className="block">
        <Card className="flex flex-col gap-3 p-5 transition hover:border-brand/40 sm:flex-row sm:items-center">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand"><HistoryIcon className="size-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2"><b className="truncate text-sm text-ink">{attempt.examPaper.title}</b><span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand">{label(attempt.catalog)}</span><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${attempt.status === "SUBMITTED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{attempt.status === "SUBMITTED" ? "Đã nộp" : "Đang làm"}</span></span>
            <span className="mt-1 block text-xs text-ink-muted">{attempt.paperPart?.title || "Bốn kỹ năng"} · {new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(attempt.updatedAt)}</span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-brand" />
        </Card>
      </Link>) : <Card padding="lg" className="text-center"><p className="font-extrabold text-ink">Chưa có lượt phù hợp</p><p className="mt-1 text-sm text-ink-muted">{page.paginated ? "Lịch sử có thể vừa được cập nhật. Hãy xem lại các lượt mới nhất." : "Bắt đầu một đề VSTEP để hệ thống lưu lịch sử cho bạn."}</p></Card>}
    </section>
    {(page.paginated || page.nextHref) && <nav aria-label="Phân trang lịch sử" className="flex flex-wrap gap-3">
      {page.previousHref && <Link href={page.previousHref} className="admin-action">Mới hơn</Link>}
      {page.nextHref && <Link href={page.nextHref} className="admin-action">Cũ hơn</Link>}
      {page.paginated && <Link href={page.latestHref} className="admin-action">Mới nhất</Link>}
    </nav>}
  </div>;
}
