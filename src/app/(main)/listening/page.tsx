import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { PageHero } from "@/components/ui/PageHero";
import { Headphones } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Luyện nghe | WEWIN EDUCATION",
};

const TRACKS = [
  { id: 1, title: "Greetings — Hello & Hi", level: "Lớp 1", duration: "1:20" },
  { id: 2, title: "My family", level: "Lớp 1", duration: "1:45" },
  { id: 3, title: "At the shop", level: "Lớp 1", duration: "2:00" },
  { id: 4, title: "Numbers 1–20", level: "Lớp 1", duration: "1:30" },
];

export default function ListeningPage() {
  return (
    <div className="mx-auto max-w-[900px]">
      <PageHero
        eyebrow="KỸ NĂNG"
        title="Luyện nghe"
        description="Nghe hội thoại ngắn theo Lớp 1–9. Audio thật sẽ bổ sung — hiện dùng transcript demo."
        stats={[
          { label: "Bài nghe", value: `${TRACKS.length}` },
          { label: "Cấp độ", value: "Lớp 1" },
        ]}
      />

      <div className="mt-5 space-y-3">
        {TRACKS.map((t) => (
          <Card key={t.id} className="flex items-center gap-4" padding="md">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <Headphones className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[15px] font-extrabold text-ink">{t.title}</h2>
              <p className="text-[12px] text-ink-muted">
                {t.level} · {t.duration}
              </p>
            </div>
            <Button type="button" variant="outline" size="sm">
              Nghe demo
            </Button>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <ImageSlot label="Minh họa luyện nghe" className="min-h-[100px]" />
      </div>

      <p className="mt-4 text-sm text-ink-muted">
        Muốn luyện dạng nghe điền từ?{" "}
        <Link href="/hsk-practice/listening-fill" className="font-semibold text-brand hover:underline">
          Mở bài tập nghe
        </Link>
      </p>

      <SiteFooter />
    </div>
  );
}
