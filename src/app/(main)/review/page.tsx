import { PageHero } from "@/components/ui/PageHero";
import { Card } from "@/components/ui/Card";
import { PracticePlayer } from "@/components/practice/PracticePlayer";
import { LoginGate } from "@/components/auth/LoginGate";
import { getCurrentUser } from "@/lib/access";
import { getMixedPracticeItems } from "@/lib/practice";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Luyện tập tổng hợp | WEWIN EDUCATION" };

export default async function ReviewPage() {
  if (!(await getCurrentUser())) return <div className="mx-auto w-full max-w-[820px]"><LoginGate title="Đăng nhập để mở phiên ôn" description="Phiên ôn tổng hợp lấy câu hỏi ngẫu nhiên từ kho Listening và Reading. Kết quả chỉ dùng trong phiên, không lưu vào lịch sử làm bài." callbackUrl="/review">{null}</LoginGate></div>;
  const items = await getMixedPracticeItems(10);
  const groups = new Set<string>();
  const questionCount = items.reduce((total, item) => {
    if (!item.payload.groupId) return total + 1;
    if (groups.has(item.payload.groupId)) return total;
    groups.add(item.payload.groupId);
    return total + (item.payload.groupQuestions?.length || 1);
  }, 0);
  return <div className="mx-auto w-full max-w-[820px] space-y-6"><PageHero eyebrow="LUYỆN TẬP TỔNG HỢP" title="Một phiên ôn trộn" description="Câu hỏi được chọn ngẫu nhiên từ các kho Listening và Reading đã xuất bản. Mỗi audio Listening đi kèm toàn bộ câu hỏi của đoạn nghe. Làm xong xem kết quả ngay, không lưu vào lịch sử." stats={[{ label: "Câu trong phiên", value: String(questionCount) }, { label: "Kỹ năng", value: "2" }, { label: "Mục tiêu", value: "Ôn lại" }]} />{items.length ? <PracticePlayer type="MIXED" items={items} /> : <Card padding="lg"><p className="text-sm text-ink-muted">Chưa có câu hỏi Listening hoặc Reading đã xuất bản để tạo phiên ôn.</p></Card>}</div>;
}
