import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { getCurrentUser } from "@/lib/access";
import { getGrammarLesson } from "@/lib/grammar";
import { GrammarError } from "@/lib/grammar-rules";
import { PageHero } from "@/components/ui/PageHero";
import { GrammarTheory } from "@/components/grammar/GrammarTheory";
import styles from "@/components/grammar/grammar.module.css";

export const dynamic = "force-dynamic";
export default async function GrammarTopicPage({ params, searchParams }: { params: Promise<{ topicSlug: string }>; searchParams: Promise<{ preview?: string }> }) {
  const { topicSlug } = await params, { preview } = await searchParams, user = await getCurrentUser();
  let lesson;
  try { lesson = await getGrammarLesson(topicSlug, user?.id, preview); }
  catch (error) { if (error instanceof GrammarError && [403, 404].includes(error.status)) notFound(); throw error; }
  return <div className={`${styles.page} space-y-6`}><Link className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand" href={preview ? "/manage/grammar" : "/grammar"}><ArrowLeft className="size-4" aria-hidden="true" />{preview ? "Về quản trị" : "Tất cả chuyên đề"}</Link><PageHero backgroundSrc="" eyebrow={`CHUYÊN ĐỀ ${lesson.number} · ${preview ? "XEM TRƯỚC" : "NGỮ PHÁP"}`} title={lesson.title} description={lesson.summary} />
    {preview && <p className={styles.note}>Bản xem trước ({lesson.status}). Kết quả chấm thử không lưu vào tiến độ.</p>}
    {lesson.completed && <p className={`${styles.note} flex items-center gap-2`}><CheckCircle2 className="size-5 text-brand" aria-hidden="true" />Bạn đã đạt tất cả bài bắt buộc của phiên bản này.</p>}
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"><GrammarTheory theory={lesson.theory} source={lesson.source} />
      <aside className={`${styles.panel} space-y-5`}><h2 className="text-lg font-bold">Luyện từng bài nhỏ</h2>{lesson.sets.map(set => <div className="border-t border-border pt-4" key={set.id}><h3 className="text-sm font-semibold">{set.title}</h3><p className="mt-2 text-xs text-ink-muted">{set.count} đơn vị chấm · {set.required ? "Bắt buộc" : "Luyện thêm"}</p>{set.progress && <p className="mt-2 text-sm text-brand">{set.progress.passedAt ? "Đã đạt" : "Cần luyện lại"} · Tốt nhất {set.progress.bestCorrect}/{set.progress.total}</p>}<Link className="admin-action mt-3 w-full justify-center" href={user ? `/grammar/${lesson.slug}/practice/${set.id}${preview ? `?preview=${lesson.id}` : ""}` : `/login?callbackUrl=${encodeURIComponent(`/grammar/${lesson.slug}/practice/${set.id}`)}`}>{preview ? "Thử bài này" : user ? "Làm bài →" : "Đăng nhập để luyện"}</Link></div>)}<p className="text-xs leading-relaxed text-ink-muted">Đạt từ 80% ở từng bài bắt buộc. Có thể làm lại ngay; không cần chờ sang ngày mai.</p></aside>
    </div></div>;
}
