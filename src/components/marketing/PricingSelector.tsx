"use client";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { useState } from "react";

const PLANS = [
  {
    id: "year",
    name: "Premium năm",
    price: "499.000",
    oldPrice: "999.000",
    perMonth: "≈41.000 ₫/tháng",
    badge: "PHỔ BIẾN GIÁ RẺ NHẤT",
    discount: "-50%",
  },
  {
    id: "lifetime",
    name: "Premium trọn đời",
    price: "499.000",
    oldPrice: "1.399.000",
    perMonth: "trả 1 lần, dùng mãi mãi",
    badge: "ƯU ĐÃI ĐẶC BIỆT",
    discount: "-64%",
  },
  {
    id: "6m",
    name: "Premium 6 tháng",
    price: "269.000",
    oldPrice: "539.000",
    perMonth: "≈45.000 ₫/tháng",
    discount: "-50%",
  },
  {
    id: "3m",
    name: "Premium 3 tháng",
    price: "149.000",
    oldPrice: "299.000",
    perMonth: "≈50.000 ₫/tháng",
    discount: "-50%",
  },
  {
    id: "1m",
    name: "Premium tháng",
    price: "59.000",
    oldPrice: "99.000",
    perMonth: "gia hạn hàng tháng",
    discount: "-40%",
  },
  {
    id: "1d",
    name: "Premium 1 ngày",
    price: "10.000",
    oldPrice: "19.000",
    perMonth: "Dùng thử",
    discount: "-47%",
  },
] as const;

const FEATURES = [
  "Toàn bộ từ vựng Lớp 1–9 (10.000+ từ)",
  "Flashcard + SRS không giới hạn",
  "5 dạng quiz nâng cao",
  "Lộ trình cá nhân hoá theo cấp độ",
  "Phát âm chuẩn + audio bản xứ",
  "AI Tutor hỗ trợ 24/7",
  "Luyện hội thoại với AI",
  "Đề thi thử Lớp 1–9 (~450 đề)",
  "Tải audio học offline",
  "Streak freeze (2 lần/tháng)",
  "Không quảng cáo",
  "Hỗ trợ ưu tiên",
];

export function PricingSelector() {
  const [selected, setSelected] = useState<(typeof PLANS)[number]["id"]>("year");
  const plan = PLANS.find((p) => p.id === selected) ?? PLANS[0];

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-3">
        {PLANS.map((p) => {
          const active = p.id === selected;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border bg-white px-4 py-3.5 text-left transition-colors",
                active
                  ? "border-brand shadow-[0_0_0_1px_var(--brand)]"
                  : "border-border hover:border-brand/40",
              )}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                  active ? "border-brand" : "border-border",
                )}
              >
                {active ? (
                  <span className="size-2.5 rounded-full bg-brand" />
                ) : null}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-ink">{p.name}</span>
                  {"badge" in p && p.badge ? (
                    <span className="rounded bg-accent-orange/15 px-1.5 py-0.5 text-[10px] font-bold text-accent-orange">
                      {p.badge}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-[12px] text-ink-muted">{p.perMonth}</p>
              </div>
              <div className="text-right">
                <div className="flex items-baseline justify-end gap-1.5">
                  <span className="text-lg font-extrabold text-ink">
                    {p.price}₫
                  </span>
                  <span className="rounded bg-brand-soft px-1 py-0.5 text-[10px] font-bold text-brand">
                    {p.discount}
                  </span>
                </div>
                <span className="text-[12px] text-ink-faint line-through">
                  {p.oldPrice}₫
                </span>
              </div>
            </button>
          );
        })}

        <Button size="lg" className="mt-2 w-full">
          Mua {plan.name} — {plan.price}₫
        </Button>
        <p className="text-center text-[12px] text-ink-muted">
          Thanh toán an toàn · VNPay · MoMo · ZaloPay · Visa · Mastercard
        </p>
      </div>

      <aside className="rounded-2xl border border-border bg-white p-5">
        <h3 className="font-[family-name:var(--font-jakarta)] text-[15px] font-bold leading-snug text-ink">
          Mở khoá Lớp 2–9, AI Tutor & hội thoại với AI
        </h3>
        <ul className="mt-4 space-y-2.5">
          {FEATURES.map((f) => (
            <li key={f} className="flex gap-2 text-[13px] text-ink">
              <Check className="mt-0.5 size-4 shrink-0 text-accent-green" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <p className="mt-5 rounded-xl bg-brand-soft px-3 py-2.5 text-[12px] font-medium text-brand">
          Học Lớp 1 trọn vẹn không cần trả tiền.
        </p>
      </aside>
    </div>
  );
}
