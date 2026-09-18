import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import { Headphones, PenLine, Puzzle, Repeat2, TextCursorInput } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Bài tập | WEWIN EDUCATION" };

const practiceTypes = [
  ["word-order", "Sắp xếp từ thành câu", "Ghép câu lệnh lớp học và câu trả lời đúng trật tự.", Puzzle],
  ["fill-blank", "Điền từ vào chỗ trống", "Chọn cụm từ phù hợp với ngữ cảnh giáo viên.", TextCursorInput],
  ["listening-fill", "Nghe điền từ", "Nghe câu mẫu và chọn từ còn thiếu.", Headphones],
  ["listening-order", "Sắp xếp hội thoại", "Nghe một lượt thoại rồi xếp lại thứ tự.", Repeat2],
  ["writing", "Luyện viết ngắn", "Viết email, phản hồi hoặc hướng dẫn ngắn.", PenLine],
];

export default function PracticePage() {
  return <div className="mx-auto max-w-[1100px]"><PageHero eyebrow="BÀI TẬP" title="Luyện tập theo dạng" description="Chọn một dạng bài, luyện trong phiên ngắn và biết bước tiếp theo cần ôn." stats={[{ label: "Dạng bài", value: "5" }, { label: "Chương trình", value: "VSTEP" }, { label: "Phiên ngắn", value: "10 câu" }]} /><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{practiceTypes.map(([slug, title, description, Icon]) => <Card key={slug as string} padding="lg" className="flex flex-col"><span className="flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand"><Icon className="size-5" /></span><h2 className="mt-4 font-[family-name:var(--font-jakarta)] text-[15px] font-extrabold text-ink">{title as string}</h2><p className="mt-2 min-h-12 text-sm leading-relaxed text-ink-muted">{description as string}</p><Link href={`/practice/${slug as string}`} className="mt-5"><Button className="w-full">Bắt đầu</Button></Link></Card>)}</div><Card className="mt-6 bg-[#FDF3E3] p-5"><p className="text-sm font-extrabold text-ink">Luyện đều theo kỹ năng</p><p className="mt-1 text-sm leading-relaxed text-ink-muted">Bạn có thể chọn một bài VSTEP trong mục Luyện thi để làm theo đúng format đề.</p></Card><SiteFooter /></div>;
}
