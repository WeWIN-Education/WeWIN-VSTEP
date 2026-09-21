import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import type { ContentKind } from "@/lib/learning-content";
import { Card } from "@/components/ui/Card";
import { LearningText } from "@/components/learning/LearningText";
import { learningDisplayBlocks } from "@/lib/learning-content-display";

export async function LearningContentDetail({ kind, id }: { kind: ContentKind; id: string }) {
  const path = kind === "SKILL" ? "/training" : "/practice";
  const actor = await getCurrentUser();
  if (!actor) redirect(`/login?callbackUrl=${encodeURIComponent(`${path}/content/${id}`)}`);
  const item = await prisma.learningContent.findFirst({ where: { id, kind, ...(actor.role === "ADMIN" ? {} : { published: true }) } });
  if (!item) notFound();
  const blocks = learningDisplayBlocks(item.body);
  return <div className="mx-auto max-w-[900px] space-y-5">
    <Link href={path} className="admin-action">← {kind === "SKILL" ? "Kỹ năng" : "Bài tập"}</Link>
    <h1 className="text-2xl font-bold">{item.title}</h1>
    <p className="text-sm text-ink-muted">{item.skill} · {item.level}{!item.published ? " · Bản xem trước, chưa mở cho học viên" : ""}</p>
    {item.audioKey && <Card><h2 className="mb-3 font-semibold">{item.skill === "SPEAKING" ? "Nghe bài nói mẫu" : "Nghe bài học"}</h2><audio controls preload="metadata" className="w-full" aria-label={`Audio ${item.title}`} src={`/api/learning-content/${item.id}/audio`} /></Card>}
    {blocks.map(({ content, answer }, i) => {
      return <Card key={i} padding="lg"><LearningText text={content} />{answer && <details className="mt-4 rounded-xl border border-border p-3"><summary className="cursor-pointer font-bold text-brand">Xem đáp án / bài mẫu và giải thích</summary><div className="mt-3"><LearningText text={answer} /></div></details>}</Card>;
    })}
  </div>;
}
