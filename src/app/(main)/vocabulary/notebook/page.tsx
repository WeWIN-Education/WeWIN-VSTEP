import { getCurrentUser } from "@/lib/access";
import { getVocabularyPage, notebookCounts } from "@/lib/vocabulary-page";
import { Card } from "@/components/ui/Card";
import { Mascot } from "@/components/ui/Mascot";
import { PageHero } from "@/components/ui/PageHero";
import { VocabularyNotebookBoard } from "@/components/vocabulary/VocabularyNotebookBoard";
import { PersonalVocabularyModal } from "@/components/vocabulary/PersonalVocabularyModal";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sổ tay từ vựng | WEWIN EDUCATION" };

export default async function VocabularyNotebookPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/vocabulary/notebook");
  const [page, counts] = await Promise.all([getVocabularyPage(user.id, { mode: "notebook" }), notebookCounts(user.id)]);
  const entries = page.items;
  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-6">
      <PageHero
        eyebrow="TỪ VỰNG · CÁ NHÂN"
        title="Sổ tay từ vựng"
        description="Lật flashcard, nghe phát âm và cập nhật mức nhớ."
        stats={[{ label: "Đang lưu", value: `${counts.ALL}` }, { label: "Đã nhớ", value: `${counts.MASTERED}` }, { label: "Đang học", value: `${counts.LEARNING}` }]}
        aside={<div className="hidden items-center gap-3 md:flex"><PersonalVocabularyModal /><Mascot state="focused" size={112} /></div>}
      />
      <div className="flex justify-end md:hidden"><PersonalVocabularyModal /></div>
      {entries.length ? (
        <VocabularyNotebookBoard key={user.id} entries={entries} initialPage={page} initialCounts={counts} userId={user.id} />
      ) : (
        <Card padding="lg" className="text-center">
          <Mascot state="curious" size={92} className="mx-auto" />
          <h2 className="mt-3 font-[family-name:var(--font-jakarta)] text-lg font-extrabold text-ink">Sổ tay đang trống</h2>
          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-ink-muted">Lưu một mục từ trong chủ đề hoặc flashcard để thấy nó ở đây và ôn lại theo nhịp của bạn.</p>
          <Link href="/vocabulary/topics" className="mt-5 inline-flex min-h-10 items-center justify-center rounded-[var(--radius-btn)] bg-brand px-4 text-xs font-extrabold text-white hover:bg-brand-dark">Khám phá từ vựng</Link>
        </Card>
      )}
    </div>
  );
}
