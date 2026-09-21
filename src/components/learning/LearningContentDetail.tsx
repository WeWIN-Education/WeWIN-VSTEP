import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import type { ContentKind } from "@/lib/learning-content";
import { Card } from "@/components/ui/Card";
import { LinkifiedText } from "@/components/ui/LinkifiedText";

export async function LearningContentDetail({ kind, id }: { kind: ContentKind; id: string }) {
  const path = kind === "SKILL" ? "/training" : "/practice";
  const actor = await getCurrentUser();
  if (!actor) redirect(`/login?callbackUrl=${encodeURIComponent(`${path}/content/${id}`)}`);
  const item = await prisma.learningContent.findFirst({ where: { id, kind, ...(actor.role === "ADMIN" ? {} : { published: true }) } });
  if (!item) notFound();
  const blocks = item.body.split(/(?=^### Q\d+)/m);
  return <div className="mx-auto max-w-[900px] space-y-5">
    <Link href={path} className="admin-action">← {kind === "SKILL" ? "Kỹ năng" : "Bài tập"}</Link>
    <h1 className="text-2xl font-bold">{item.title}</h1>
    <p className="text-sm text-ink-muted">{item.skill} · {item.level}{!item.published ? " · Bản xem trước, chưa mở cho học viên" : ""}</p>
    {blocks.map((block, i) => {
      const answerIndex = block.search(/^(?:Đáp án đúng:|Bài mẫu:|Transcript bài mẫu:)/m);
      const content = answerIndex < 0 ? block : block.slice(0, answerIndex);
      const answer = answerIndex < 0 ? null : block.slice(answerIndex);
      return <Card key={i} padding="lg"><div className="whitespace-pre-wrap break-words text-sm leading-7"><LinkifiedText>{content}</LinkifiedText></div>{answer && <details className="mt-4 rounded-xl border border-border p-3"><summary className="cursor-pointer font-bold text-brand">Xem đáp án / bài mẫu và giải thích</summary><div className="mt-3 whitespace-pre-wrap break-words text-sm leading-7"><LinkifiedText>{answer}</LinkifiedText></div></details>}</Card>;
    })}
  </div>;
}
