import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getLessonBySlugs } from "@/lib/curriculum";
import {
  BookOpen,
  ChevronLeft,
  MessageCircle,
  SpellCheck2,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ level: string; slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { level, slug } = await params;
  const lesson = await getLessonBySlugs(level, slug);
  if (!lesson) return { title: "Bài học | WEWIN" };
  return { title: `${lesson.title} | WEWIN EDUCATION` };
}

export default async function LessonDetailPage({ params }: Props) {
  const { level, slug } = await params;
  const lesson = await getLessonBySlugs(level, slug);
  if (!lesson) notFound();

  const { topic } = lesson;
  const { gradeLevel } = topic;

  return (
    <div className="mx-auto max-w-[800px]">
      <Link
        href={`/hsk/${gradeLevel.slug}`}
        className="mb-4 inline-flex items-center gap-1 text-[13px] font-semibold text-ink-muted hover:text-brand"
      >
        <ChevronLeft className="size-4" />
        Quay lại {gradeLevel.title}
      </Link>

      <Card padding="lg">
        <p className="text-[12px] font-semibold text-brand">
          {gradeLevel.title} · {topic.title}
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-jakarta)] text-2xl font-extrabold text-ink">
          {lesson.title}
        </h1>
        {lesson.description ? (
          <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
            {lesson.description}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-3 text-[13px] text-ink-muted">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-2.5 py-1">
            <BookOpen className="size-3.5" />
            {lesson.vocabCount} từ vựng
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-2.5 py-1">
            <SpellCheck2 className="size-3.5" />
            {lesson.grammarCount} ngữ pháp
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-2.5 py-1">
            <MessageCircle className="size-3.5" />
            {lesson.dialogueCount} hội thoại
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-2.5 py-1">
            {lesson.durationMin} phút
          </span>
        </div>

        <div className="mt-6 rounded-xl border border-dashed border-border bg-surface p-5 text-[14px] leading-relaxed text-ink">
          {lesson.content ||
            "Nội dung bài học chi tiết (từ vựng, ngữ pháp, hội thoại) sẽ được bổ sung ở phase sau. Đây là trang demo để điều hướng giáo trình."}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button disabled>Bắt đầu luyện tập (sắp có)</Button>
          <Link href={`/hsk/${gradeLevel.slug}`}>
            <Button variant="outline">Danh sách bài học</Button>
          </Link>
        </div>
      </Card>

      <SiteFooter />
    </div>
  );
}
