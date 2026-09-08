import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/Button";
import { ImageSlot } from "@/components/ui/ImageSlot";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Giới thiệu | WEWIN EDUCATION",
  description: "WEWIN EDUCATION — app học tiếng Anh cho người Việt.",
};

const STATS = [
  { label: "Bài học", value: "1.250+" },
  { label: "Từ vựng", value: "10.000+" },
  { label: "Điểm ngữ pháp", value: "1.800+" },
  { label: "Đề thi thử", value: "450+" },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-[1000px]">
      <section className="grid items-center gap-8 rounded-[20px] border border-border bg-white p-6 md:grid-cols-[1.2fr_0.8fr] md:p-8">
        <div>
          <p className="text-[12px] font-semibold text-ink-muted">
            Câu chuyện · từ 2025
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-jakarta)] text-[28px] font-extrabold leading-tight text-ink md:text-[34px]">
            WEWIN ra đời để làm một app{" "}
            <span className="text-brand">tốt ở tất cả</span>
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">
            Một niềm tin bướng bỉnh: app học tiếng Anh có thể tốt ở tất cả —
            từ vựng, audio, ngữ pháp và lộ trình Lớp 1–9, gói gọn trong một nơi.
          </p>
          <Link href="/hsk" className="mt-5 inline-block">
            <Button>Xem lộ trình Lớp 1–9</Button>
          </Link>
        </div>
        <div className="relative mx-auto aspect-square w-full max-w-[260px]">
          <Image
            src="/brand/mascot-left-clear.png"
            alt="WEWIN mascot"
            fill
            className="object-contain"
            sizes="260px"
          />
        </div>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-border bg-white p-4 text-center"
          >
            <p className="font-[family-name:var(--font-jakarta)] text-2xl font-extrabold text-brand">
              {s.value}
            </p>
            <p className="mt-1 text-[13px] text-ink-muted">{s.label}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 rounded-[20px] border border-border bg-white p-6 md:p-8">
        <h2 className="font-[family-name:var(--font-jakarta)] text-xl font-extrabold text-ink">
          Vì sao có WEWIN
        </h2>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">
          Chúng tôi đã thử nhiều app. Và muốn một nơi học tiếng Anh nghiêm túc,
          gọn gàng và tôn trọng thời gian của bạn — lộ trình rõ, luyện tập đủ,
          theo dõi tiến độ minh bạch.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="font-bold text-ink">Vấn đề người học thường gặp</h3>
            <ul className="mt-2 space-y-2 text-[13px] text-ink-muted">
              <li>• Phát âm không có hướng dẫn rõ</li>
              <li>• Audio máy móc, khó bắt nhịp thực tế</li>
              <li>• Lộ trình rối, không biết học gì tiếp</li>
              <li>• Nội dung rời rạc giữa web và app</li>
            </ul>
          </div>
          <ImageSlot label="Ảnh đội ngũ / sản phẩm" className="min-h-[160px]" />
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
