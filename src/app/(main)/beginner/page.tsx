import { SiteFooter } from "@/components/layout/SiteFooter";
import { ImageSlot } from "@/components/ui/ImageSlot";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Người mới bắt đầu | WEWIN EDUCATION",
  description: "Lộ trình 6 bước học tiếng Anh từ con số 0.",
};

const STEPS = [
  {
    n: 1,
    label: "ABC",
    title: "Bảng chữ cái & phát âm",
    desc: "Làm quen 26 chữ cái, âm cơ bản và cách phát âm chuẩn.",
    href: "/pronunciation",
  },
  {
    n: 2,
    label: "Phonics",
    title: "Phonics – ghép âm",
    desc: "Học cách đọc từ mới bằng cách ghép âm, không cần đoán.",
    href: "/pronunciation",
  },
  {
    n: 3,
    label: "Words",
    title: "Từ vựng nền tảng",
    desc: "500+ từ vựng thiết yếu cho giao tiếp và Lớp 1.",
    href: "/vocab/topics",
  },
  {
    n: 4,
    label: "Grammar",
    title: "Ngữ pháp cơ bản",
    desc: "Câu đơn, thì hiện tại và cấu trúc dùng hàng ngày.",
    href: "/grammar",
  },
  {
    n: 5,
    label: "Listen",
    title: "Luyện nghe",
    desc: "Nghe hội thoại ngắn, làm quen tốc độ nói thực tế.",
    href: "/listening",
  },
  {
    n: 6,
    label: "Speak",
    title: "Luyện nói",
    desc: "Tự giới thiệu, hỏi đáp và hội thoại đơn giản.",
    href: "/speaking",
  },
];

export default function BeginnerPage() {
  return (
    <div className="mx-auto max-w-[1100px]">
      <section className="grid items-center gap-6 rounded-[20px] border border-border bg-white p-5 md:grid-cols-[1fr_240px] md:p-8">
        <div>
          <p className="text-[12px] font-bold tracking-[0.08em] text-brand">
            — CHO NGƯỜI MỚI BẮT ĐẦU
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-jakarta)] text-[28px] font-extrabold leading-tight text-ink md:text-[34px]">
            Bắt đầu học tiếng Anh{" "}
            <span className="underline decoration-accent-orange decoration-4 underline-offset-4">
              từ con số 0
            </span>
          </h1>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-ink-muted">
            Lộ trình 6 bước rõ ràng giúp bạn xây nền tảng phát âm, từ vựng, ngữ
            pháp rồi luyện nghe–nói — mỗi ngày chỉ cần khoảng 15 phút.
          </p>
        </div>
        <ImageSlot label="Minh họa lộ trình người mới" className="min-h-[160px]" />
      </section>

      <section className="mt-8">
        <div className="relative mb-6 hidden h-2 rounded-full bg-brand/20 md:block">
          <div className="absolute inset-y-0 left-0 w-full rounded-full bg-gradient-to-r from-brand via-brand to-accent-orange opacity-80" />
          <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between px-4">
            {STEPS.map((s) => (
              <span
                key={s.n}
                className="flex size-8 items-center justify-center rounded-full bg-brand text-xs font-bold text-white shadow"
              >
                {s.n}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((step) => (
            <article
              key={step.n}
              className="flex flex-col rounded-2xl border border-border bg-white p-4"
            >
              <div className="relative mb-3 flex size-16 items-center justify-center rounded-full bg-brand-soft font-[family-name:var(--font-jakarta)] text-sm font-bold text-brand">
                {step.label}
                <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded bg-brand text-[10px] font-bold text-white">
                  {step.n}
                </span>
              </div>
              <h3 className="font-bold text-ink">{step.title}</h3>
              <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-ink-muted">
                {step.desc}
              </p>
              <Link
                href={step.href}
                className="mt-3 text-[13px] font-bold text-brand hover:text-accent-orange"
              >
                Vào học →
              </Link>
            </article>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
