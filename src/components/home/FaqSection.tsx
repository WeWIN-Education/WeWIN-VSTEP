"use client";

import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

const FAQS = [
  {
    q: "Học tiếng Anh online trên WEWIN có miễn phí không?",
    a: "Có. Lớp 1 miễn phí trọn vẹn. Các lớp từ Lớp 2 trở lên và một số tính năng nâng cao thuộc gói Premium.",
  },
  {
    q: "Người mới bắt đầu nên tự học tiếng Anh từ đâu?",
    a: "Bắt đầu từ mục Người mới bắt đầu hoặc lộ trình Lớp 1 — học từ vựng, ngữ pháp và hội thoại theo từng cấp độ.",
  },
  {
    q: "Học tiếng Anh bao lâu thì đạt trình độ các lớp phổ thông?",
    a: "Tuỳ nền tảng và thời gian học mỗi ngày. Nhiều học viên hoàn thành Lớp 1–2 sau vài tuần luyện đều đặn; các lớp cao hơn cần luyện lâu hơn.",
  },
  {
    q: "Có cần biết tiếng Anh sẵn để dùng WEWIN không?",
    a: "Không. Giao diện và giải thích mặc định bằng tiếng Việt, phù hợp cả người mới bắt đầu.",
  },
  {
    q: "WEWIN có bài tập theo chương trình phổ thông không?",
    a: "Có. Lộ trình Lớp 1–9 gồm bài học, luyện nghe–nói và kiểm tra theo từng cấp độ.",
  },
  {
    q: "Có thể học tiếng Anh trên điện thoại không?",
    a: "Có. Dùng trên web mobile hoặc tải ứng dụng Android/iOS.",
  },
  {
    q: "WEWIN khác gì các app học tiếng Anh khác?",
    a: "Lộ trình Lớp 1–9 rõ ràng, giải thích tiếng Việt, bài tập đa dạng và hệ thống game hoá (XP, streak, bảng xếp hạng).",
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section>
      <h2 className="mb-4 font-[family-name:var(--font-jakarta)] text-xl font-extrabold text-ink md:text-2xl">
        Câu hỏi thường gặp
      </h2>
      <div className="space-y-2">
        {FAQS.map((item, index) => {
          const isOpen = open === index;
          return (
            <div
              key={item.q}
              className="overflow-hidden rounded-2xl border border-border bg-white"
            >
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                onClick={() => setOpen(isOpen ? null : index)}
              >
                <span className="text-[14px] font-semibold text-ink">{item.q}</span>
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-ink-muted transition-transform",
                    isOpen && "rotate-180",
                  )}
                />
              </button>
              {isOpen ? (
                <div className="border-t border-border px-4 py-3 text-[13px] leading-relaxed text-ink-muted">
                  {item.a}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
