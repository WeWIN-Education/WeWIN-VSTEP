import { ExamImportForm } from "@/components/exam-import/ExamImportForm";
import { RecordActions } from "@/components/manage/RecordActions";
import { ExamVisibilityButton } from "@/components/exam-import/ExamVisibilityButton";
import { PageHero } from "@/components/ui/PageHero";
import { prisma } from "@/lib/prisma";
import { ArrowUpRight, ClipboardList, FileDown } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";

const statusLabels: Record<string, string> = {
  PUBLISHED: "Đã xuất bản",
  READY: "Sẵn sàng",
  SAMPLE: "Đang ẩn",
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

export default async function ExamImportPage() {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login?callbackUrl=/manage/exams/import");
  if (actor.role !== "ADMIN") redirect("/dashboard");

  const recentPapers = await prisma.examPaper.findMany({
    where: { programme: "VSTEP" },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, slug: true, title: true, subtitle: true, target: true, questionCount: true, status: true, questions: true, createdAt: true },
  });
  const recentRows = recentPapers.map((paper) => {
    const metadata = paper.questions && typeof paper.questions === "object" && !Array.isArray(paper.questions) ? paper.questions : null;
    const imported = Boolean(metadata && "sourceName" in metadata && typeof metadata.sourceName === "string");
    return { ...paper, imported, sourceName: imported && metadata && typeof metadata.sourceName === "string" ? metadata.sourceName : null };
  });

  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-6">
      <PageHero
        eyebrow="QUẢN LÝ NỘI DUNG"
        title="Nhập đề VSTEP từ DOCX"
        description="Nhập DOCX và audio để tạo đề bốn kỹ năng. Kiểm tra trước khi xuất bản."
        aside={
          <div className="flex flex-wrap gap-2 md:max-w-[210px] md:justify-end">
            <a href="/templates/WEWIN_VSTEP_Exam_Import_Template.docx" download className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-btn)] bg-brand px-4 text-sm font-extrabold text-white shadow-sm transition hover:bg-brand-dark">
              <FileDown className="size-4" /> Tải mẫu DOCX
            </a>
          </div>
        }
        stats={[
          { label: "Nghe", value: "35 câu" },
          { label: "Đọc", value: "40 câu" },
          { label: "Viết · Nói", value: "2 · 3" },
        ]}
      />

      <ExamImportForm />

      <section className="rounded-[24px] border border-border bg-white p-5 shadow-sm sm:p-6" aria-labelledby="recent-exams-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-brand">Lịch sử</p>
            <h2 id="recent-exams-title" className="mt-1 font-[family-name:var(--font-jakarta)] text-xl font-extrabold text-ink">Đề VSTEP gần đây</h2>
            <p className="mt-1 text-sm text-ink-muted">Phân biệt đề hệ thống và đề được tạo từ DOCX bằng nhãn nguồn.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-bold text-ink-muted"><ClipboardList className="size-3.5" /> {recentRows.length} đề gần nhất</span>
        </div>

        {recentRows.length ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <caption className="sr-only">Mười đề VSTEP gần đây, gồm nguồn tạo, trạng thái và đường dẫn mở đề</caption>
              <thead><tr className="border-b border-border text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-muted"><th scope="col" className="px-3 py-3">Chỉnh sửa</th><th scope="col" className="px-3 py-3">Đề</th><th scope="col" className="px-3 py-3">Nguồn</th><th scope="col" className="px-3 py-3">Slug</th><th scope="col" className="px-3 py-3">Mục tiêu</th><th scope="col" className="px-3 py-3">Số câu</th><th scope="col" className="px-3 py-3">Trạng thái</th><th scope="col" className="px-3 py-3">Ngày tạo</th><th scope="col" className="px-3 py-3"><span className="sr-only">Mở đề</span></th></tr></thead>
              <tbody>
                {recentRows.map((paper) => (
                  <tr key={paper.id} className="border-b border-border/70 last:border-0">
                    <td className="px-3 py-3"><RecordActions endpoint={`/api/manage/exams/${paper.id}`} title={paper.title} fields={[{ key: "title", label: "Tên đề", value: paper.title, maxLength: 160 }, { key: "subtitle", label: "Mô tả", value: paper.subtitle ?? "" }]} deleteDescription="Xóa bản ghi đề và các phần đề. Chỉ được xóa khi chưa có học viên làm bài; đề đã có lượt làm hãy dùng chức năng Ẩn. Audio nguồn được giữ lại để bảo vệ file dùng chung." /></td>
                    <td className="max-w-[250px] px-3 py-3"><p className="truncate font-extrabold text-ink">{paper.title}</p>{paper.subtitle ? <p className="mt-0.5 truncate text-xs text-ink-muted">{paper.subtitle}</p> : null}</td>
                    <td className="px-3 py-3"><span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-extrabold ${paper.imported ? "bg-blue-50 text-brand" : "bg-surface text-ink-muted"}`} title={paper.sourceName || undefined}>{paper.imported ? "Nhập DOCX" : "Hệ thống"}</span></td>
                    <td className="px-3 py-3 font-mono text-xs text-ink-muted">{paper.slug}</td>
                    <td className="px-3 py-3 text-ink-muted">{paper.target || "B1–C1"}</td>
                    <td className="px-3 py-3 font-semibold text-ink">{paper.questionCount}</td>
                    <td className="px-3 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold ${paper.status === "PUBLISHED" ? "bg-emerald-50 text-emerald-700" : "bg-brand-soft text-brand"}`}>{statusLabels[paper.status] || paper.status}</span></td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-ink-muted">{formatDate(paper.createdAt)}</td>
                    <td className="px-3 py-3"><div className="flex flex-wrap items-center gap-2"><Link href={`/exam/vstep/${paper.slug}`} aria-label={`Mở ${paper.title}`} className="inline-flex rounded-lg p-1.5 text-brand transition hover:bg-brand-soft"><ArrowUpRight className="size-4" /></Link>{paper.imported ? <ExamVisibilityButton id={paper.id} title={paper.title} hidden={paper.status === "SAMPLE"} /> : null}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface px-5 py-8 text-center"><p className="text-sm font-extrabold text-ink">Chưa có đề VSTEP nào được nhập</p><p className="mt-1 text-xs text-ink-muted">Bản đề đầu tiên sẽ xuất hiện ở đây sau khi xuất bản thành công.</p></div>
        )}
      </section>
    </div>
  );
}
