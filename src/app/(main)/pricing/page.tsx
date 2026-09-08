import { PricingSelector } from "@/components/marketing/PricingSelector";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Check } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bảng giá | WEWIN EDUCATION",
  description: "Học tiếng Anh miễn phí thật. Trả tiền khi thấy giá trị.",
};

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-[1100px]">
      <section className="mb-5 rounded-[20px] border border-[#C5D4EE] bg-gradient-to-br from-[#EEF3FC] via-[#E8EEF9] to-[#DDE7F8] p-5 md:p-7">
        <p className="text-[12px] font-bold tracking-[0.12em] text-accent-orange">
          BẢNG GIÁ
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-jakarta)] text-[28px] font-extrabold leading-tight text-ink md:text-[34px]">
          Học <span className="text-brand">miễn phí thật.</span> Trả tiền khi thấy
          giá trị.
        </h1>
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-ink">
          {[
            "Học Lớp 1 miễn phí mãi mãi",
            "Không cần thẻ tín dụng",
            "Huỷ bất cứ lúc nào",
          ].map((item) => (
            <li key={item} className="inline-flex items-center gap-1.5">
              <Check className="size-4 text-accent-green" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <PricingSelector />
      <SiteFooter />
    </div>
  );
}
