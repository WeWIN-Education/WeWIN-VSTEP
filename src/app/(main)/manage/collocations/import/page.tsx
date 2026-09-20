import { VocabularyImportForm } from "@/components/vocabulary/VocabularyImportForm";
import { VocabularyCollectionManager } from "@/components/vocabulary/VocabularyCollectionManager";
import { PageHero } from "@/components/ui/PageHero";
import { getCurrentUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function CollocationsImportPage() {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login?callbackUrl=/manage/collocations/import");
  if (actor.role !== "ADMIN") redirect("/dashboard");

  const collections = await prisma.vocabularyCollection.findMany({ where: { kind: "COLLOCATION" }, orderBy: { createdAt: "desc" }, include: { _count: { select: { topics: true, entries: true, imports: true } } } });

  const history = await prisma.vocabularyImport.findMany({
    where: { kind: "COLLOCATION" },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, fileName: true, status: true, totalRows: true, insertedRows: true, updatedRows: true, errorRows: true, createdAt: true },
  });

  return <div className="mx-auto w-full max-w-[1000px] space-y-6"><PageHero eyebrow="QUẢN LÝ NỘI DUNG" title="Nhập kho collocations từ Excel" description="Kiểm tra trước dữ liệu, sau đó xác nhận để cập nhật collection collocations và lưu lịch sử nhập riêng." aside={<a href="/templates/WEWIN_Collocation_Import_Template.xlsx" download className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-btn)] bg-brand px-4 text-sm font-extrabold text-white">Tải template Excel</a>} /><VocabularyImportForm kind="COLLOCATION" /><VocabularyCollectionManager initialCollections={collections.map(item => ({ ...item, createdAt: item.createdAt.toISOString(), topicCount: item._count.topics, entryCount: item._count.entries, importCount: item._count.imports }))} /><section className="rounded-[24px] border border-border bg-white p-5 shadow-sm"><h2 className="font-[family-name:var(--font-jakarta)] text-lg font-extrabold text-ink">Lịch sử nhập collocations</h2>{history.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b border-border text-xs font-bold uppercase tracking-wide text-ink-muted"><th className="px-3 py-3">File</th><th className="px-3 py-3">Trạng thái</th><th className="px-3 py-3">Tổng</th><th className="px-3 py-3">Mới</th><th className="px-3 py-3">Cập nhật</th><th className="px-3 py-3">Lỗi</th></tr></thead><tbody>{history.map((item) => <tr key={item.id} className="border-b border-border/70 last:border-0"><td className="px-3 py-3 font-semibold text-ink">{item.fileName}</td><td className="px-3 py-3 text-ink-muted">{item.status}</td><td className="px-3 py-3 text-ink-muted">{item.totalRows}</td><td className="px-3 py-3 text-ink-muted">{item.insertedRows}</td><td className="px-3 py-3 text-ink-muted">{item.updatedRows}</td><td className="px-3 py-3 text-ink-muted">{item.errorRows}</td></tr>)}</tbody></table></div> : <p className="mt-3 text-sm text-ink-muted">Chưa có lượt nhập collocations nào.</p>}</section></div>;
}
