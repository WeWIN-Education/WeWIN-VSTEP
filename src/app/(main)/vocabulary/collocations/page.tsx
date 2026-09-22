import { LoginGate } from "@/components/auth/LoginGate";
import { VocabularyFlashcards } from "@/components/vocabulary/VocabularyFlashcards";
import { PageHero } from "@/components/ui/PageHero";
import { getCurrentUser } from "@/lib/access";
import { getVocabularyPage } from "@/lib/vocabulary-page";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Cụm từ & collocations | WEWIN EDUCATION" };

export default async function VocabularyCollocationsPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const user = await getCurrentUser();
  const queryValue = (await searchParams).q;
  const query = (Array.isArray(queryValue) ? queryValue[0] : queryValue)?.trim().slice(0, 100) || "";
  if (!user) return <div className="mx-auto w-full max-w-[1120px] space-y-6"><PageHero eyebrow="TỪ VỰNG · CỤM TỪ" title="Cụm từ & collocations" description="Đăng nhập để tìm, học flashcard và lưu tiến độ." /><LoginGate title="Đăng nhập để mở kho cụm từ" description="Đăng nhập để mở nội dung và lưu tiến độ." callbackUrl="/vocabulary/collocations">{null}</LoginGate></div>;

  const collections = await prisma.vocabularyCollection.findMany({ where: { kind: "COLLOCATION" }, select: { id: true, name: true } });
  const page = await getVocabularyPage(user.id, { mode: "collocations", q: query });
  const entries = page.items;
  const endpoint = `/api/vocabulary/entries?${new URLSearchParams({ mode: "collocations", q: query })}`;
  const sessionKey = `${user.id}:${endpoint}`;

  return <div className="mx-auto w-full max-w-[1120px] space-y-6"><PageHero eyebrow="TỪ VỰNG · CỤM TỪ" title="Cụm từ & collocations" description="Tìm cụm từ, xem ví dụ và luyện bằng flashcard." stats={[{ label: "Tải ban đầu", value: String(entries.length) }, { label: "Bộ dữ liệu", value: String(collections.length) }]} /><form method="get" className="flex flex-col gap-2 sm:flex-row"><label htmlFor="collocation-query" className="sr-only">Tìm cụm từ</label><input id="collocation-query" name="q" defaultValue={query} placeholder="Tìm cụm từ, nghĩa hoặc ví dụ…" className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-white px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" /><button type="submit" className="min-h-11 rounded-[var(--radius-btn)] bg-brand px-5 text-sm font-extrabold text-white hover:bg-brand-dark">Tìm kiếm</button></form>{entries.length ? <VocabularyFlashcards key={sessionKey} showIpa={false} entries={entries} title="Cụm từ" pagination={{ endpoint, sessionKey, nextCursor: page.nextCursor, previousCursor: page.previousCursor }} /> : <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center text-sm text-ink-muted">Chưa có cụm từ phù hợp.</div>}</div>;
}
