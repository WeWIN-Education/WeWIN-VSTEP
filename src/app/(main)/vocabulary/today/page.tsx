import Link from "next/link";
import { getCurrentUser } from "@/lib/access";
import { getStudyDashboard } from "@/lib/vocabulary-study";
import { VocabularyToday } from "@/components/vocabulary/VocabularyToday";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";

export const metadata = { title: "Học từ vựng hôm nay | WEWIN EDUCATION" };
export const dynamic = "force-dynamic";

export default async function VocabularyTodayPage() {
  const user = await getCurrentUser();
  if (!user) return <div className="mx-auto max-w-[1000px] space-y-5"><PageHero eyebrow="TỪ VỰNG" title="Mỗi ngày một chút. Nhớ lâu hơn." description="Học từ mới theo bài nhỏ, ôn lại từ đến hạn và kiểm tra để mở bài tiếp theo." /><Card padding="lg"><p className="text-ink-muted">Đăng nhập để lưu bài đang học và lịch ôn riêng. Bạn vẫn có thể xem kho từ và học flashcard miễn phí.</p><div className="mt-5 flex flex-wrap gap-3"><Link className="admin-action bg-brand text-white" href="/login?callbackUrl=%2Fvocabulary%2Ftoday">Đăng nhập</Link><Link className="admin-action" href="/vocabulary/topics">Xem kho từ vựng →</Link></div></Card></div>;
  const dashboard = await getStudyDashboard(user.id);
  return <VocabularyToday initial={dashboard} />;
}
