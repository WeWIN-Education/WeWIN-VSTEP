import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import { ArrowLeft, Clock3 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

const FEATURES = {
  skills: {
    eyebrow: "KỸ NĂNG",
    title: "Luyện theo kỹ năng",
    description: "Các phiên luyện Listening, Reading, Writing và Speaking đang được WEWIN hoàn thiện.",
  },
  practice: {
    eyebrow: "LUYỆN TẬP",
    title: "Luyện tập theo dạng",
    description: "Kho bài tập ngắn theo từng dạng sẽ sớm được mở với nội dung VSTEP chính thức.",
  },
} as const;

type Feature = keyof typeof FEATURES;

function getFeature(value: string): Feature | null {
  return value in FEATURES ? value as Feature : null;
}

export async function generateMetadata({ params }: { params: Promise<{ feature: string }> }): Promise<Metadata> {
  const { feature } = await params;
  const content = getFeature(feature);
  return { title: content ? `${FEATURES[content].title} | WEWIN EDUCATION` : "Coming soon | WEWIN EDUCATION" };
}

export default async function ComingSoonPage({ params }: { params: Promise<{ feature: string }> }) {
  const { feature } = await params;
  const content = getFeature(feature);
  if (!content) notFound();

  return <div className="mx-auto w-full max-w-[900px] space-y-6"><PageHero eyebrow={FEATURES[content].eyebrow} title="Coming soon" description={FEATURES[content].description} stats={[{ label: "Trạng thái", value: "Đang hoàn thiện" }, { label: "Mục tiêu", value: FEATURES[content].title }]} /><Card padding="lg" className="text-center"><span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-brand"><Clock3 className="size-7" /></span><h2 className="mt-4 font-[family-name:var(--font-jakarta)] text-xl font-extrabold text-ink">Tính năng sắp ra mắt</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-ink-muted">WEWIN đang chuẩn bị nội dung và trải nghiệm luyện tập tốt hơn. Bạn có thể tiếp tục làm đề VSTEP hoặc mở phiên ôn tổng hợp trong lúc chờ tính năng này.</p><div className="mt-5 flex flex-wrap justify-center gap-3"><Link href="/exam/vstep" className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-btn)] bg-brand px-4 text-sm font-extrabold text-white hover:bg-brand-dark">Luyện đề VSTEP</Link><Link href="/review" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-btn)] border border-brand/30 px-4 text-sm font-extrabold text-brand hover:bg-brand-soft"><ArrowLeft className="size-4" />Ôn tập tổng hợp</Link></div></Card></div>;
}
