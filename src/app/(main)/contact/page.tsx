import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/Button";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { Mail, MessagesSquare, Clock } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Liên hệ | WEWIN EDUCATION",
  description: "Hỗ trợ tài khoản, thanh toán và hợp tác với WEWIN.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-[1000px]">
      <section className="grid items-center gap-6 rounded-[20px] border border-[#C5D4EE] bg-gradient-to-br from-[#EEF3FC] to-[#DDE7F8] p-6 md:grid-cols-[1.2fr_0.8fr] md:p-8">
        <div>
          <p className="text-[12px] font-bold tracking-wide text-brand">HỖ TRỢ</p>
          <h1 className="mt-2 font-[family-name:var(--font-jakarta)] text-[28px] font-extrabold text-ink md:text-[34px]">
            Cần giúp đỡ?
            <br />
            Cứ nhắn nhé!
          </h1>
          <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-ink-muted">
            Mọi thắc mắc về tài khoản, thanh toán Premium, lỗi kỹ thuật hay góp
            ý nội dung — chúng tôi luôn lắng nghe và phản hồi từng email.
          </p>
          <a href="mailto:support@wewin.education" className="mt-5 inline-block">
            <Button>Gửi email</Button>
          </a>
        </div>
        <ImageSlot label="Mascot hỗ trợ" className="min-h-[180px]" />
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-border bg-white p-5">
          <Clock className="size-5 text-brand" />
          <h3 className="mt-3 font-bold text-ink">&lt; 24h phản hồi</h3>
          <p className="mt-1 text-[13px] text-ink-muted">
            Thứ 2 – Thứ 7, 9:00 – 18:00 (giờ Việt Nam)
          </p>
        </article>
        <article className="rounded-2xl border border-border bg-white p-5">
          <Mail className="size-5 text-brand" />
          <h3 className="mt-3 font-bold text-ink">Email hỗ trợ</h3>
          <p className="mt-1 text-[13px] text-ink-muted">
            support@wewin.education
          </p>
        </article>
        <article className="rounded-2xl border border-border bg-white p-5">
          <MessagesSquare className="size-5 text-brand" />
          <h3 className="mt-3 font-bold text-ink">Cộng đồng học viên</h3>
          <p className="mt-1 text-[13px] text-ink-muted">
            Hỏi đáp nhanh trong nhóm cộng đồng WEWIN.
          </p>
        </article>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-white p-6">
        <h2 className="font-[family-name:var(--font-jakarta)] text-lg font-extrabold text-ink">
          Thông tin hữu ích trước khi liên hệ
        </h2>
        <ul className="mt-3 space-y-2 text-[13px] text-ink-muted">
          <li>• Thanh toán & đơn hàng: gửi kèm mã đơn hàng để được hỗ trợ nhanh.</li>
          <li>• Lỗi kỹ thuật: mô tả thiết bị, trình duyệt và ảnh chụp màn hình.</li>
          <li>• Hợp tác: nêu rõ nội dung đề xuất và thông tin liên hệ.</li>
        </ul>
      </section>

      <SiteFooter />
    </div>
  );
}
