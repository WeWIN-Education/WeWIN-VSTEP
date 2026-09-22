import { Card } from "@/components/ui/Card";
import { GradingFeedback } from "@/components/exam/GradingFeedback";
import { PageHero } from "@/components/ui/PageHero";
import { getCurrentUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { examReview } from "@/lib/exam-review";
import { resolveCatalogExamData, scoreExam } from "@/lib/exam-scoring";
import { savedAnswers } from "@/lib/exam-submission";
import { publicGrading } from "@/lib/grading-jobs";
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
  const grading = publicGrading(attempt.grading);
  const gradingParts = [
    { key: "writing", label: "Writing", status: attempt.writingStatus, score: grading.writingScore, value: grading.writing, visible: attempt.catalog === "FULL" || attempt.catalog === "WRITING" || attempt.writingStatus !== "NOT_STARTED" || Array.isArray(grading.writing) },
    { key: "speaking", label: "Speaking", status: attempt.speakingStatus, score: grading.speakingScore, value: grading.speaking, visible: attempt.catalog === "FULL" || attempt.catalog === "SPEAKING" || attempt.speakingStatus !== "NOT_STARTED" || Array.isArray(grading.speaking) },
  ].filter((part) => part.visible);
  const recordings = Object.entries(object(attempt.recordings)).map(([id, raw]) => {
    const entry = object(raw);
    const playback = typeof entry.audioData === "string" ? entry.audioData : typeof entry.playbackUrl === "string" ? entry.playbackUrl : "";
    return [id, { ...entry, audioData: playback }] as const;
  });
  const displayScore = (value: number | null | undefined) => typeof value === "number" ? `${value}/10` : "—";
  const catalogLabel = ({ FULL: "Full Test", LISTENING: "Nghe", READING: "Đọc", WRITING: "Viết", SPEAKING: "Nói" } as Record<string, string>)[attempt.catalog] || attempt.catalog;
  const gradingStatusLabel = (status: unknown, value: unknown) => {
    if (Array.isArray(value) && value.length) return "Đã có kết quả";
    if (status === "GRADED") return "Đã có kết quả";
    if (status === "PARTIAL") return "Có một phần kết quả";
    if (status === "NOT_GRADED") return "Đang chờ chấm";
    if (status === "NOT_STARTED") return "Chưa có dữ liệu";
    return "Chưa có kết quả";
  };
  return <div className="mx-auto w-full max-w-[1120px] space-y-6"><Link href="/history" className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-brand"><ArrowLeft className="size-4" />Lịch sử bài làm</Link><PageHero eyebrow={`${catalogLabel} · ${attempt.status === "SUBMITTED" ? "ĐÃ NỘP" : "ĐANG LÀM"}`} title={attempt.examPaper.title} description={`Lượt ${attempt.paperPart?.title || "Full Test"} · cập nhật ${new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(attempt.updatedAt)}`} stats={[{ label: "Nghe", value: displayScore(score?.listening.score) }, { label: "Đọc", value: displayScore(score?.reading.score) }, { label: "Viết", value: displayScore(grading.writingScore as number | null | undefined) }, { label: "Nói", value: displayScore(grading.speakingScore as number | null | undefined) }, { label: "Câu đã lưu", value: String(bookmarks.length) }]} /><div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]"><Card padding="lg"><div className="flex items-center gap-2"><CheckCircle2 className="size-5 text-brand" /><h2 className="text-xl font-extrabold text-ink">Đáp án và nhận xét</h2></div>{attempt.status !== "SUBMITTED" ? <p className="mt-4 text-sm leading-relaxed text-ink-muted">Lượt này chưa nộp. Tiến độ đã lưu tại đề thi và sẽ có review sau khi hoàn tất.</p> : review.length ? <div className="mt-5 space-y-3">{review.map((item) => <article key={item.id} className="rounded-2xl border border-border p-4"><div className="flex items-start justify-between gap-3"><p className="text-sm font-extrabold text-ink">Câu {item.number}: {item.prompt}</p>{item.bookmarked ? <Star className="size-4 shrink-0 text-[#A97621]" fill="currentColor" aria-label="Đã bookmark" /> : null}</div><p className="mt-2 text-sm text-ink-muted">Bạn chọn: <b className="text-ink">{item.selectedAnswer || "Chưa trả lời"}</b></p><p className="mt-1 text-sm text-ink-muted">Đáp án: <b className="text-brand">{item.correctAnswer}</b></p></article>)}</div> : <p className="mt-4 text-sm text-ink-muted">Lượt này không có câu hỏi trắc nghiệm cần review.</p>}</Card><div className="space-y-5"><Card padding="lg"><h2 className="text-xl font-extrabold text-ink">Bài viết đã lưu</h2>{Object.entries(saved.writingAnswers).length ? <div className="mt-4 space-y-3">{Object.entries(saved.writingAnswers).map(([id, value]) => <article key={id} className="rounded-2xl bg-surface p-3"><p className="text-xs font-bold uppercase text-brand">{id}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">{String(value)}</p></article>)}</div> : <p className="mt-3 text-sm text-ink-muted">Chưa có bài viết được lưu.</p>}</Card><Card padding="lg"><div className="flex items-center gap-2"><Mic className="size-5 text-brand" /><h2 className="text-xl font-extrabold text-ink">Bản ghi nói</h2></div>{recordings.length ? <div className="mt-4 space-y-3">{recordings.map(([id, raw]) => { const entry = object(raw); return <div key={id} className="rounded-2xl bg-surface p-3"><p className="text-xs font-bold uppercase text-brand">{id}</p>{typeof entry.audioData === "string" ? <audio className="mt-2 w-full" controls src={entry.audioData} /> : null}</div>; })}</div> : <p className="mt-3 text-sm text-ink-muted">Chưa có bản ghi.</p>}</Card></div></div><Card padding="lg"><div className="flex items-center gap-2"><CheckCircle2 className="size-5 text-brand" /><h2 className="text-xl font-extrabold text-ink">Kết quả AI chấm</h2></div><p className="mt-2 text-sm text-ink-muted">Kết quả được đọc từ dữ liệu đã lưu của lượt làm bài.</p>{attempt.status !== "SUBMITTED" ? <p className="mt-4 text-sm text-ink-muted">Chỉ hiển thị kết quả AI sau khi nộp bài.</p> : gradingParts.length ? <div className="mt-5 space-y-5">{gradingParts.map((part) => <section key={part.key} className="rounded-2xl border border-border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-extrabold text-ink">{part.label}</h3><div className="flex items-center gap-3 text-sm"><span className="font-bold text-brand">{gradingStatusLabel(part.status, part.value)}</span>{typeof part.score === "number" ? <b className="text-ink">{part.score}/10</b> : null}</div></div>{Array.isArray(part.value) && part.value.length ? <GradingFeedback value={part.value} /> : <p className="mt-3 text-sm text-ink-muted">Kết quả AI chưa sẵn sàng. Bài làm vẫn đã được lưu.</p>}</section>)}</div> : <p className="mt-4 text-sm text-ink-muted">Lượt này chưa có phần Writing hoặc Speaking để chấm AI.</p>}</Card></div>;
}
