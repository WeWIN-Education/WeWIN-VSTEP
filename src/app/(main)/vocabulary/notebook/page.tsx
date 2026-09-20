import { getCurrentUser } from "@/lib/access";
import { Card } from "@/components/ui/Card";
import { Mascot } from "@/components/ui/Mascot";
import { PageHero } from "@/components/ui/PageHero";
import { VocabularyNotebookBoard } from "@/components/vocabulary/VocabularyNotebookBoard";
import { PersonalVocabularyModal } from "@/components/vocabulary/PersonalVocabularyModal";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sổ tay từ vựng | WEWIN EDUCATION" };

export default async function VocabularyNotebookPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/vocabulary/notebook");
  const [progress, personal] = await Promise.all([
    prisma.vocabularyProgress.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, take: 100, include: { entry: true } }),
    prisma.personalVocabulary.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, take: 100 }),
  ]);
  const entries = [
    ...progress.map((item) => ({ id: item.entry.id, term: item.entry.term, meaningVi: item.entry.meaningVi, partOfSpeech: item.entry.partOfSpeech, ipa: item.entry.ipa, exampleEn: item.entry.exampleEn, exampleVi: item.entry.exampleVi, status: item.status })),
    ...personal.map((item) => ({ id: item.id, term: item.term, meaningVi: item.meaningVi, partOfSpeech: null, ipa: item.ipa, exampleEn: item.exampleEn, exampleVi: null, status: item.status })),
  ];
  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-6">
      <PageHero
        eyebrow="TỪ VỰNG · CÁ NHÂN"
        title="Sổ tay từ vựng"
        description="Lật flashcard, nghe phát âm và cập nhật mức nhớ."
        stats={[{ label: "Đang lưu", value: `${progress.length}` }, { label: "Đã nhớ", value: `${progress.filter((item) => item.status === "MASTERED").length}` }, { label: "Đang học", value: `${progress.filter((item) => item.status === "LEARNING").length}` }]}
        aside={<div className="hidden items-center gap-3 md:flex"><PersonalVocabularyModal /><Mascot state="focused" size={112} /></div>}
      />
      <div className="flex justify-end md:hidden"><PersonalVocabularyModal /></div>
      {entries.length ? (
        <VocabularyNotebookBoard entries={entries} />
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
