import { SiteFooter } from "@/components/layout/SiteFooter";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ngữ pháp | WEWIN EDUCATION",
};

const TOPICS = [
  {
    title: "Động từ to be (am / is / are)",
    level: "Lớp 1",
    example: "I am a student. She is my sister.",
  },
  {
    title: "This is / That is",
    level: "Lớp 1",
    example: "This is my book. That is your bag.",
  },
  {
    title: "Câu hỏi Yes/No với Do",
    level: "Lớp 1–2",
    example: "Do you like milk? Yes, I do.",
  },
  {
    title: "Sở hữu my / your / his / her",
    level: "Lớp 1",
    example: "My name is Lan. Her name is Mai.",
  },
  {
    title: "How much / How many",
    level: "Lớp 1–2",
    example: "How much is this? How many apples?",
  },
  {
    title: "Thì hiện tại đơn (giới thiệu)",
    level: "Lớp 2+",
    example: "I go to school every day.",
  },
];

export default function GrammarPage() {
  return (
    <div className="mx-auto max-w-[900px]">
      <PageHero
        eyebrow="NGỮ PHÁP"
        title="Ngữ pháp tiếng Anh"
        description="Các điểm ngữ pháp nền tảng giải thích bằng tiếng Việt, kèm ví dụ ngắn."
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {TOPICS.map((t) => (
          <Card key={t.title} padding="lg">
            <p className="text-[11px] font-bold uppercase text-brand">{t.level}</p>
            <h2 className="mt-1 font-[family-name:var(--font-jakarta)] text-[15px] font-extrabold text-ink">
              {t.title}
            </h2>
            <p className="mt-2 rounded-lg bg-surface px-3 py-2 text-[13px] font-medium text-ink">
              {t.example}
            </p>
          </Card>
        ))}
      </div>

      <SiteFooter />
    </div>
  );
}
