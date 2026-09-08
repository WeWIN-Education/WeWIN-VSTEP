import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Luyện tập tổng hợp | WEWIN EDUCATION",
};

const LINKS = [
  { href: "/hsk-practice", title: "5 dạng bài tập", desc: "Word order, điền từ, nghe…" },
  { href: "/exam", title: "Đề thi thử", desc: "Làm đề theo Lớp 1–9" },
  { href: "/listening", title: "Luyện nghe", desc: "Hội thoại ngắn" },
  { href: "/vocab/topics", title: "Từ vựng", desc: "Theo chủ đề" },
  { href: "/game", title: "Trò chơi", desc: "Gõ từ & PK" },
  { href: "/grammar", title: "Ngữ pháp", desc: "Điểm ngữ pháp nền tảng" },
];

export default function PracticeHubPage() {
  return (
    <div className="mx-auto max-w-[900px]">
      <PageHero
        eyebrow="ÔN LUYỆN"
        title="Luyện tập tổng hợp"
        description="Một nơi để nhảy nhanh tới bài tập, đề thi, kỹ năng và game."
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {LINKS.map((l) => (
          <Card key={l.href} padding="lg" className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-extrabold text-ink">{l.title}</h2>
              <p className="text-[13px] text-ink-muted">{l.desc}</p>
            </div>
            <Link href={l.href}>
              <Button variant="outline" size="sm">
                Mở
              </Button>
            </Link>
          </Card>
        ))}
      </div>

      <SiteFooter />
    </div>
  );
}
