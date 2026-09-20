import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import { getCurrentUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { examReview } from "@/lib/exam-review";
import { resolveCatalogExamData, scoreExam } from "@/lib/exam-scoring";
import { savedAnswers } from "@/lib/exam-submission";
import { ArrowLeft, CheckCircle2, Mic, Star } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

function object(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }

export default async function AttemptHistoryPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/history");
  const { attemptId } = await params;
  const attempt = await prisma.examAttempt.findFirst({ where: { id: attemptId, userId: user.id }, include: { examPaper: { select: { title: true, slug: true, sections: true, questions: true } }, paperPart: { select: { title: true, skill: true, sections: true, questions: true } } } });
  if (!attempt) notFound();
  const exam = resolveCatalogExamData({ slug: attempt.examPaper.slug, sections: attempt.examPaper.sections, questions: attempt.examPaper.questions, catalog: attempt.catalog, partSections: attempt.paperPart?.sections, partQuestions: attempt.paperPart?.questions });
  const saved = savedAnswers(attempt.answers);
  const score = exam ? scoreExam(exam.paper, exam.privateData, saved.answers as Record<string, string>) : null;
  const bookmarks = await prisma.questionBookmark.findMany({ where: { userId: user.id, examPaperId: attempt.examPaperId, catalog: attempt.catalog }, select: { questionId: true } });
  const review = exam ? examReview(exam.paper, exam.privateData, saved.answers, new Set(bookmarks.map((bookmark) => bookmark.questionId))) : [];
  const recordings = Object.entries(object(attempt.recordings)).map(([id, raw]) => {
    const entry = object(raw);
    const playback = typeof entry.audioData === "string" ? entry.audioData : typeof entry.playbackUrl === "string" ? entry.playbackUrl : "";
    return [id, { ...entry, audioData: playback }] as const;
  });
  const displayScore = (value: number | null | undefined) => typeof value === "number" ? `${value}/10` : "—";
  const catalogLabel = ({ FULL: "Full Test", LISTENING: "Nghe", READING: "Đọc", WRITING: "Viết", SPEAKING: "Nói" } as Record<string, string>)[attempt.catalog] || attempt.catalog;
  return <div className="mx-auto w-full max-w-[1120px] space-y-6"><Link href="/history" className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-brand"><ArrowLeft className="size-4" />Lịch sử bài làm</Link><PageHero eyebrow={`${catalogLabel} · ${attempt.status === "SUBMITTED" ? "ĐÃ NỘP" : "ĐANG LÀM"}`} title={attempt.examPaper.title} description={`Lượt ${attempt.paperPart?.title || "Full Test"} · cập nhật ${new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(attempt.updatedAt)}`} stats={[{ label: "Nghe", value: displayScore(score?.listening.score) }, { label: "Đọc", value: displayScore(score?.reading.score) }, { label: "Câu đã lưu", value: String(bookmarks.length) }]} /><div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]"><Card padding="lg"><div className="flex items-center gap-2"><CheckCircle2 className="size-5 text-brand" /><h2 className="text-xl font-extrabold text-ink">Đáp án và nhận xét</h2></div>{attempt.status !== "SUBMITTED" ? <p className="mt-4 text-sm leading-relaxed text-ink-muted">Lượt này chưa nộp. Tiến độ đã lưu tại đề thi và sẽ có review sau khi hoàn tất.</p> : review.length ? <div className="mt-5 space-y-3">{review.map((item) => <article key={item.id} className="rounded-2xl border border-border p-4"><div className="flex items-start justify-between gap-3"><p className="text-sm font-extrabold text-ink">Câu {item.number}: {item.prompt}</p>{item.bookmarked ? <Star className="size-4 shrink-0 text-[#A97621]" fill="currentColor" aria-label="Đã bookmark" /> : null}</div><p className="mt-2 text-sm text-ink-muted">Bạn chọn: <b className="text-ink">{item.selectedAnswer || "Chưa trả lời"}</b></p><p className="mt-1 text-sm text-ink-muted">Đáp án: <b className="text-brand">{item.correctAnswer}</b></p></article>)}</div> : <p className="mt-4 text-sm text-ink-muted">Chưa có dữ liệu review.</p>}</Card><div className="space-y-5"><Card padding="lg"><h2 className="text-xl font-extrabold text-ink">Bài viết đã lưu</h2>{Object.entries(saved.writingAnswers).length ? <div className="mt-4 space-y-3">{Object.entries(saved.writingAnswers).map(([id, value]) => <article key={id} className="rounded-2xl bg-surface p-3"><p className="text-xs font-bold uppercase text-brand">{id}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">{String(value)}</p></article>)}</div> : <p className="mt-3 text-sm text-ink-muted">Chưa có bài viết được lưu.</p>}</Card><Card padding="lg"><div className="flex items-center gap-2"><Mic className="size-5 text-brand" /><h2 className="text-xl font-extrabold text-ink">Bản ghi nói</h2></div>{recordings.length ? <div className="mt-4 space-y-3">{recordings.map(([id, raw]) => { const entry = object(raw); return <div key={id} className="rounded-2xl bg-surface p-3"><p className="text-xs font-bold uppercase text-brand">{id}</p>{typeof entry.audioData === "string" ? <audio className="mt-2 w-full" controls src={entry.audioData} /> : null}</div>; })}</div> : <p className="mt-3 text-sm text-ink-muted">Chưa có bản ghi.</p>}</Card></div></div></div>;
}
