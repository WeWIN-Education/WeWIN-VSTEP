import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Luyện nói | WEWIN EDUCATION",
};

const PROMPTS = [
  {
    title: "Tự giới thiệu",
    lines: ["Hello, my name is…", "I am … years old.", "Nice to meet you."],
  },
  {
    title: "Giới thiệu gia đình",
    lines: ["This is my mother.", "This is my father.", "I have one sister."],
  },
  {
    title: "Ở cửa hàng",
    lines: ["How much is this?", "I'd like some bread.", "Thank you!"],
  },
];

export default function SpeakingPage() {
  return (
    <div className="mx-auto max-w-[900px]">
      <PageHero
        eyebrow="KỸ NĂNG"
        title="Luyện nói"
        description="Đọc to theo mẫu câu Lớp 1. Ghi âm trên thiết bị của bạn — chấm điểm AI sẽ bổ sung sau."
      />

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {PROMPTS.map((p) => (
          <Card key={p.title} padding="lg" className="flex flex-col">
            <h2 className="font-[family-name:var(--font-jakarta)] text-[15px] font-extrabold text-ink">
              {p.title}
            </h2>
            <ul className="mt-3 flex-1 space-y-2 text-[13px] text-ink-muted">
              {p.lines.map((line) => (
                <li key={line} className="rounded-lg bg-surface px-3 py-2 font-medium text-ink">
                  {line}
                </li>
              ))}
            </ul>
            <Button className="mt-4 w-full" variant="outline" type="button">
              Luyện đọc to
            </Button>
          </Card>
        ))}
      </div>

      <p className="mt-4 text-sm text-ink-muted">
        Kết hợp với{" "}
        <Link href="/pronunciation" className="font-semibold text-brand hover:underline">
          bảng phiên âm / phonics
        </Link>
        .
      </p>

      <SiteFooter />
    </div>
  );
}
