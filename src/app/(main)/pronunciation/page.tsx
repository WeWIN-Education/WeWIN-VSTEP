import { SiteFooter } from "@/components/layout/SiteFooter";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Phát âm & bảng phiên âm | WEWIN EDUCATION",
};

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const PHONICS = [
  { pattern: "a", example: "cat /æ/", tip: "Âm ngắn a" },
  { pattern: "e", example: "pen /e/", tip: "Âm ngắn e" },
  { pattern: "i", example: "sit /ɪ/", tip: "Âm ngắn i" },
  { pattern: "o", example: "hot /ɒ/", tip: "Âm ngắn o" },
  { pattern: "u", example: "cup /ʌ/", tip: "Âm ngắn u" },
  { pattern: "sh", example: "ship /ʃ/", tip: "Âm sh" },
  { pattern: "th", example: "think /θ/", tip: "Âm th vô thanh" },
  { pattern: "ch", example: "chair /tʃ/", tip: "Âm ch" },
];

export default function PronunciationPage() {
  return (
    <div className="mx-auto max-w-[1000px]">
      <PageHero
        eyebrow="PHÁT ÂM"
        title="Bảng phiên âm & phonics"
        description="Làm quen 26 chữ cái tiếng Anh và các mẫu âm phổ biến — nền tảng cho đọc và nói."
      />

      <div className="mt-6">
        <SectionTitle title="26 chữ cái (A–Z)" />
        <div className="flex flex-wrap gap-2">
          {LETTERS.map((L) => (
            <div
              key={L}
              className={cn(
                "flex size-11 items-center justify-center rounded-xl border border-border bg-white text-sm font-extrabold text-brand sm:size-12",
              )}
            >
              {L}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <SectionTitle title="Mẫu phonics cơ bản" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PHONICS.map((p) => (
            <Card key={p.pattern} padding="md">
              <p className="text-[20px] font-extrabold text-brand">{p.pattern}</p>
              <p className="mt-1 text-[13px] font-semibold text-ink">{p.example}</p>
              <p className="mt-1 text-[12px] text-ink-muted">{p.tip}</p>
            </Card>
          ))}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
