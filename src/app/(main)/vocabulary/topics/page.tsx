import { Card } from "@/components/ui/Card";
import { Mascot } from "@/components/ui/Mascot";
import { PageHero } from "@/components/ui/PageHero";
import { prisma } from "@/lib/prisma";
import { ArrowRight, BookOpen } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Từ vựng theo chủ đề | WEWIN EDUCATION" };

export default async function VocabularyTopicsPage() {
  const collections = await prisma.vocabularyCollection.findMany({ where: { kind: "VOCABULARY" }, orderBy: { code: "asc" }, include: { topics: { orderBy: { sortOrder: "asc" }, include: { _count: { select: { entries: true } } } } } });
  return <div className="mx-auto w-full max-w-[1120px] space-y-6"><PageHero eyebrow="TỪ VỰNG" title="Từ vựng theo chủ đề" description="Chọn trình độ, mở chủ đề và đánh dấu mức nhớ." stats={[{ label: "Bộ từ", value: `${collections.length}` }, { label: "Chủ đề", value: `${collections.reduce((sum, c) => sum + c.topics.length, 0)}` }, { label: "Trục", value: "A1–B1" }]} aside={<Mascot state="friendly" size={112} className="hidden md:block" />} />{collections.length ? collections.map((collection) => <section key={collection.id}><div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><p className="text-xs font-extrabold uppercase tracking-wide text-brand">{collection.code}</p><h2 className="mt-1 font-[family-name:var(--font-jakarta)] text-xl font-extrabold text-ink">{collection.name}</h2></div><span className="text-xs text-ink-muted">{collection.topics.reduce((sum, topic) => sum + topic._count.entries, 0)} mục từ</span></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{collection.topics.map((topic) => <Link key={topic.id} href={`/vocabulary/topics/${collection.code}?topic=${encodeURIComponent(topic.code)}`} className="group"><Card className="h-full transition hover:-translate-y-0.5 hover:border-brand/40"><span className="flex size-10 items-center justify-center rounded-2xl bg-brand-soft text-brand"><BookOpen className="size-5" aria-hidden="true" /></span><h3 className="mt-3 font-extrabold text-ink">{topic.name}</h3><p className="mt-1 text-xs text-ink-muted">{topic._count.entries} từ</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-extrabold text-brand">Mở chủ đề <ArrowRight className="size-3 transition group-hover:translate-x-1" /></span></Card></Link>)}</div></section>) : <Card padding="lg" className="text-center"><Mascot state="curious" size={86} className="mx-auto" /><p className="mt-3 text-sm text-ink-muted">Chưa có bộ từ phù hợp.</p></Card>}</div>;
}
