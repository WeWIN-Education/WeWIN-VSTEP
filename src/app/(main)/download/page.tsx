import { SiteFooter } from "@/components/layout/SiteFooter";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { Check, Smartphone } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tải ứng dụng | WEWIN EDUCATION",
  description: "Tải WEWIN cho Android và iOS — học tiếng Anh mọi lúc mọi nơi.",
};

export default function DownloadPage() {
  return (
    <div className="mx-auto max-w-[1000px]">
      <section className="grid items-center gap-8 rounded-[20px] border border-border bg-white p-6 md:grid-cols-2 md:p-8">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[12px] font-bold tracking-wide text-brand">
            <Smartphone className="size-3.5" />
            ỨNG DỤNG DI ĐỘNG
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-jakarta)] text-[28px] font-extrabold leading-tight text-ink md:text-[34px]">
            Học tiếng Anh mọi lúc, mọi nơi
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">
            Mang WEWIN theo bên mình — học offline, nhận nhắc học giữ streak và
            đồng bộ tiến độ giữa điện thoại và web.
          </p>
          <ul className="mt-4 space-y-2 text-[13px] text-ink">
            {[
              "Đồng bộ tiến độ với tài khoản web",
              "Nhắc học mỗi ngày để giữ streak",
              "Audio phát âm chuẩn người bản xứ",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Check className="size-4 text-accent-green" />
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap gap-3">
            <div className="inline-flex h-12 min-w-[160px] items-center justify-center rounded-xl bg-ink px-4 text-left text-white">
              <div>
                <p className="text-[10px] opacity-80">Tải trên</p>
                <p className="text-sm font-bold">Google Play</p>
              </div>
            </div>
            <div className="inline-flex h-12 min-w-[160px] items-center justify-center rounded-xl border border-border bg-white px-4 text-left">
              <div>
                <p className="text-[10px] text-ink-muted">Tải về từ</p>
                <p className="text-sm font-bold text-ink">App Store</p>
              </div>
            </div>
          </div>
          <p className="mt-3 text-[12px] text-ink-faint">
            Có mặt trên cả Android và iOS. (Link store sẽ cập nhật sau)
          </p>
        </div>

        <div className="space-y-4">
          <ImageSlot label="Mockup app WEWIN" className="min-h-[280px]" />
          <div className="rounded-2xl border border-border bg-surface p-4">
            <p className="text-[13px] font-bold text-ink">Quét để tải nhanh</p>
            <p className="mt-1 text-[12px] text-ink-muted">
              Dùng camera điện thoại quét mã QR để mở trang tải ứng dụng.
            </p>
            <ImageSlot
              label="QR code"
              aspect="aspect-square"
              className="mt-3 mx-auto max-w-[120px]"
            />
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-white p-6">
        <h2 className="font-[family-name:var(--font-jakarta)] text-lg font-extrabold text-ink">
          Cộng đồng WEWIN
        </h2>
        <p className="mt-2 text-[13px] text-ink-muted">
          Theo dõi fanpage để nhận mẹo học và thông báo tính năng mới; vào nhóm
          để hỏi bài và luyện cùng bạn học.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border p-4">
            <p className="font-semibold text-ink">Fanpage Facebook</p>
            <p className="mt-1 text-[12px] text-ink-muted">
              Mẹo học tiếng Anh, tính năng mới
            </p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="font-semibold text-ink">Nhóm Facebook</p>
            <p className="mt-1 text-[12px] text-ink-muted">
              Hỏi bài, chữa lỗi, học cùng cộng đồng
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
