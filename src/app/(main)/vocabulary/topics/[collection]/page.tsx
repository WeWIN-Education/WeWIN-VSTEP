import { PageHero } from "@/components/ui/PageHero";
import { Mascot } from "@/components/ui/Mascot";
import { VocabularyFlashcards, VocabularyFlashcardLauncher } from "@/components/vocabulary/VocabularyFlashcards";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/access";
import { getVocabularyPage } from "@/lib/vocabulary-page";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function VocabularyCollectionPage({ params, searchParams }: { params: Promise<{ collection: string }>; searchParams: Promise<{ topic?: string; q?: string }> }) {
  const [{ collection }, filters, user] = await Promise.all([params, searchParams, getCurrentUser()]);
  const collectionData = await prisma.vocabularyCollection.findFirst({ where: { code: collection.toUpperCase(), kind: "VOCABULARY" }, include: { topics: { orderBy: { sortOrder: "asc" }, include: { _count: { select: { entries: true } } } } } });
  if (!collectionData) notFound();
  if (!user) return <div className="mx-auto w-full max-w-[1120px] space-y-5"><Link href="/vocabulary/topics" className="inline-flex text-sm font-bold text-brand hover:underline">← Tất cả bộ từ</Link><PageHero eyebrow={`${collectionData.code} · DANH MỤC`} title={collectionData.name} description="Đăng nhập để mở mục từ, flashcard và lưu sổ tay." /><CardGate /></div>;
  const topic = filters.topic ? collectionData.topics.find((item) => item.code === filters.topic) : undefined;
  const query = filters.q?.trim().slice(0, 100);
  const scope = { mode: "collection" as const, collection: collectionData.id, topic: topic?.code, q: query };
  const page = await getVocabularyPage(user.id, scope);
  const entries = page.items;
  const endpoint = `/api/vocabulary/entries?${new URLSearchParams({ mode: scope.mode, collection: scope.collection, topic: scope.topic ?? "", q: scope.q ?? "" })}`;
  const sessionKey = `${user.id}:${endpoint}`;
  const selectedTopicLabel = topic?.name ?? "Tất cả chủ đề";
  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-5">
      <Link href="/vocabulary/topics" className="inline-flex text-sm font-bold text-brand hover:underline">← Tất cả bộ từ</Link>
      <PageHero
        eyebrow={`${collectionData.code} · ${selectedTopicLabel}`}
        title={topic ? `${topic.name}` : collectionData.name}
        description={topic ? `Lật thẻ để xem nghĩa, ví dụ và cách dùng.` : "Chọn chủ đề hoặc tìm theo từ khóa."}
        stats={[{ label: "Tải ban đầu", value: `${entries.length}` }, { label: "Tổng chủ đề", value: `${collectionData.topics.length}` }, { label: "Mức", value: collectionData.code === "B1" ? "B1" : "A1–A2" }]}
        aside={<div className="flex flex-col items-center gap-3"><Mascot state="ready" size={164} /><VocabularyFlashcardLauncher label="Học flashcard" /></div>}
      />
      <form className="flex flex-wrap gap-2" method="get">
        <input name="q" defaultValue={query} placeholder="Tìm từ hoặc nghĩa…" className="h-11 min-w-[220px] flex-1 rounded-xl border border-border bg-white px-3 text-sm outline-none focus:border-brand" />
        <select name="topic" defaultValue={topic?.code ?? ""} className="h-11 rounded-xl border border-border bg-white px-3 text-sm outline-none focus:border-brand"><option value="">Tất cả chủ đề</option>{collectionData.topics.map((item) => <option key={item.id} value={item.code}>{item.name}</option>)}</select>
        <button className="h-11 rounded-[var(--radius-btn)] bg-brand px-5 text-sm font-extrabold text-white hover:bg-brand-dark" type="submit">Lọc</button>
      </form>
      {entries.length ? (
        <VocabularyFlashcards key={sessionKey} entries={entries} title={topic?.name ?? collectionData.name} pagination={{ endpoint, sessionKey, nextCursor: page.nextCursor, previousCursor: page.previousCursor }} />
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center text-sm text-ink-muted"><Mascot state="curious" size={72} className="mx-auto" /><p className="mt-3">Không tìm thấy mục từ phù hợp.</p></div>
      )}
    </div>
  );
}

function CardGate() { return <div className="rounded-2xl border border-brand-soft bg-white p-8 text-center shadow-sm"><p className="text-base font-extrabold text-ink">Nội dung học cần tài khoản</p><p className="mt-2 text-sm text-ink-muted">Đăng nhập để mở kho từ vựng.</p><Link href="/login?callbackUrl=/vocabulary/topics" className="mt-5 inline-flex min-h-10 items-center justify-center rounded-[var(--radius-btn)] bg-brand px-4 text-sm font-extrabold text-white hover:bg-brand-dark">Đăng nhập</Link></div>; }
