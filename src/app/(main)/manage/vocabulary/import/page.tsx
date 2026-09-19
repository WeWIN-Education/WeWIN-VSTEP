import { VocabularyImportForm } from "@/components/vocabulary/VocabularyImportForm";
import { VocabularyCollectionManager } from "@/components/vocabulary/VocabularyCollectionManager";
import { PageHero } from "@/components/ui/PageHero";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";

export default async function VocabularyImportPage() {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login?callbackUrl=/manage/vocabulary/import");
  if (actor.role !== "ADMIN") redirect("/dashboard");

  const history = await prisma.vocabularyImport.findMany({
    where: { kind: "VOCABULARY" },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, fileName: true, status: true, totalRows: true, insertedRows: true, updatedRows: true, errorRows: true, createdAt: true },
  });

  const collections = await prisma.vocabularyCollection.findMany({
    where: { kind: "VOCABULARY" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      sourceFile: true,
      createdAt: true,
      _count: { select: { topics: true, entries: true, imports: true } },
    },
  });

  const collectionSummaries = collections.map((collection) => ({
    id: collection.id,
    code: collection.code,
    name: collection.name,
    description: collection.description,
    sourceFile: collection.sourceFile,
    createdAt: collection.createdAt.toISOString(),
    topicCount: collection._count.topics,
    entryCount: collection._count.entries,
    importCount: collection._count.imports,
  }));

  return <div className="mx-auto w-full max-w-[1000px] space-y-6"><PageHero eyebrow="QUẢN LÝ NỘI DUNG" title="Nhập kho từ vựng từ Excel" description="Tải workbook theo mẫu của WEWIN. Hệ thống kiểm tra trước, cập nhật theo mã mục từ và lưu lịch sử nhập." aside={<a href="/templates/WEWIN_Vocabulary_Import_Template.xlsx" download className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-btn)] bg-brand px-4 text-sm font-extrabold text-white">Tải template Excel</a>} /><VocabularyImportForm /><VocabularyCollectionManager initialCollections={collectionSummaries} /><section className="rounded-[24px] border border-border bg-white p-5 shadow-sm"><h2 className="font-[family-name:var(--font-jakarta)] text-lg font-extrabold text-ink">Lịch sử nhập gần đây</h2>{history.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b border-border text-xs font-bold uppercase tracking-wide text-ink-muted"><th className="px-3 py-3">File</th><th className="px-3 py-3">Trạng thái</th><th className="px-3 py-3">Tổng</th><th className="px-3 py-3">Mới</th><th className="px-3 py-3">Cập nhật</th><th className="px-3 py-3">Lỗi</th></tr></thead><tbody>{history.map((item) => <tr key={item.id} className="border-b border-border/70 last:border-0"><td className="px-3 py-3 font-semibold text-ink">{item.fileName}</td><td className="px-3 py-3 text-ink-muted">{item.status}</td><td className="px-3 py-3 text-ink-muted">{item.totalRows}</td><td className="px-3 py-3 text-ink-muted">{item.insertedRows}</td><td className="px-3 py-3 text-ink-muted">{item.updatedRows}</td><td className="px-3 py-3 text-ink-muted">{item.errorRows}</td></tr>)}</tbody></table></div> : <p className="mt-3 text-sm text-ink-muted">Chưa có lượt nhập nào.</p>}</section></div>;
}
