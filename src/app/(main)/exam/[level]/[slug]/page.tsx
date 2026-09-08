import { ExamTake, type QuizQuestion } from "@/components/exam/ExamTake";
import { getExamBySlugs } from "@/lib/practice";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Props = { params: Promise<{ level: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { level, slug } = await params;
  return { title: `Làm đề ${slug} · ${level} | WEWIN EDUCATION` };
}

export default async function ExamTakePage({ params }: Props) {
  const { level: levelSlug, slug } = await params;
  const match = /^lop-(\d+)$/.exec(levelSlug);
  if (!match) notFound();
  const level = Number(match[1]);

  let paper = null;
  try {
    paper = await getExamBySlugs(level, slug);
  } catch {
    notFound();
  }
  if (!paper) notFound();

  const questions = (Array.isArray(paper.questions) ? paper.questions : []) as QuizQuestion[];

  return (
    <div className="mx-auto max-w-[900px]">
      <Link
        href={`/exam/${levelSlug}`}
        className="mb-4 inline-block text-[13px] font-semibold text-brand hover:underline"
      >
        ← Danh sách đề Lớp {level}
      </Link>
      <ExamTake
        title={paper.title}
        level={level}
        slug={paper.slug}
        durationMin={paper.durationMin}
        questions={questions}
      />
    </div>
  );
}
