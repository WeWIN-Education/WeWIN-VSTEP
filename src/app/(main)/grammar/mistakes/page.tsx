import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { grammarReviewList } from "@/lib/grammar";
import { PageHero } from "@/components/ui/PageHero";
import styles from "@/components/grammar/grammar.module.css";

export const dynamic = "force-dynamic";
export default async function GrammarMistakesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=%2Fgrammar%2Fmistakes");
  const reviews = await grammarReviewList(user.id);
  const groups = [...new Map(reviews.map(r => [`${r.lesson.id}:${r.setId}`, { ...r, count: reviews.filter(v => v.lesson.id === r.lesson.id && v.setId === r.setId).length }])).values()];
  return <div className={`${styles.page} space-y-6`}><PageHero backgroundSrc="" eyebrow="ÔN NGỮ PHÁP" title="Ôn lại để nhớ chắc hơn." description="Ưu tiên các câu đã đến hạn. Câu chưa đúng sẽ quay lại sau 10 phút; trả lời đúng giúp giãn thời gian ôn." /><Link className="admin-action" href="/grammar">← Danh sách chuyên đề</Link><section className={`${styles.panel} space-y-5`}><h2 className="text-xl font-bold">{reviews.length ? `${reviews.length} câu đến hạn trong lượt này` : "Chưa có câu đến hạn ôn"}</h2>{!reviews.length && <p className="text-sm leading-relaxed text-ink-muted">Bạn có thể tiếp tục các bài luyện. Những câu chưa khớp đáp án sẽ xuất hiện ở đây khi đến hạn.</p>}{groups.map(item => <div key={`${item.lesson.id}:${item.setId}`} className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4"><div><h3 className="font-semibold">{item.lesson.title}</h3><p className="mt-1 text-sm text-ink-muted">{item.count} câu trong bài {item.setId}</p></div><Link className="admin-action" href={`/grammar/${item.lesson.slug}/practice/${item.setId}?mode=REVIEW`}>Bắt đầu ôn →</Link></div>)}</section></div>;
}
