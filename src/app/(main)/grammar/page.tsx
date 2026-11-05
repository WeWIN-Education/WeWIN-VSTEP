import Link from "next/link";
import { GrammarCatalog } from "@/components/grammar/GrammarCatalog";
import { PageHero } from "@/components/ui/PageHero";
import { getCurrentUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { grammarSummary } from "@/lib/grammar";
import styles from "@/components/grammar/grammar.module.css";

export const metadata = { title: "Ngữ pháp | WEWIN VSTEP" };
export const dynamic = "force-dynamic";
export default async function GrammarPage() {
  const user = await getCurrentUser();
  const lessons = await prisma.grammarLesson.findMany({ where: { status: "PUBLISHED" }, select: grammarSummary, orderBy: { number: "asc" } });
  const progress = user ? await prisma.grammarSetProgress.groupBy({ by: ["lessonId"], where: { userId: user.id, lessonId: { in: lessons.map(l => l.id) }, passedAt: { not: null } }, _count: true }) : [];
  return <div className={`${styles.page} space-y-6`}><PageHero backgroundSrc="" eyebrow="NGỮ PHÁP VSTEP" title="Hiểu từng chút. Dùng đúng mỗi ngày." description="Khám phá 6 nhóm kiến thức, luyện từng bài nhỏ và ôn lại những câu cần củng cố." stats={[{ label: "Chuyên đề đã mở", value: String(lessons.length) }, { label: "Ngưỡng hoàn thành bài", value: "80%" }]} />
    <div className="flex flex-wrap gap-3"><Link className="admin-action" href="/grammar/mistakes">Sổ lỗi sai →</Link>{user?.role === "ADMIN" && <Link className="admin-action" href="/manage/grammar">Quản lý ngữ pháp →</Link>}</div>
    {!user && <p className={styles.note}>Bạn có thể đọc lý thuyết không cần tài khoản. Đăng nhập để làm bài và lưu tiến độ riêng.</p>}
    {!lessons.length ? <div className={styles.panel}><h2 className="font-bold">Nội dung đang được chuẩn bị</h2><p className="mt-2 text-sm text-ink-muted">Admin cần nhập, duyệt và công bố chuyên đề trước khi mở bài học.</p></div> : <GrammarCatalog lessons={lessons.map(lesson => ({ id: lesson.id, number: lesson.number, slug: lesson.slug, title: lesson.title, summary: lesson.summary, passed: user ? progress.find(p => p.lessonId === lesson.id)?._count ?? 0 : null }))} />}
  </div>;
}
