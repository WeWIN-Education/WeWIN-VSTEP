import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import { LoginGate } from "@/components/auth/LoginGate";
import { getCurrentUser } from "@/lib/access";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Công cụ | WEWIN EDUCATION",
};

export default async function ToolsPage() {
  if (!(await getCurrentUser())) return <div className="mx-auto max-w-[900px]"><PageHero eyebrow="CÔNG CỤ" title="Công cụ học tiếng Anh" description="Đăng nhập để mở công cụ học." /><LoginGate title="Đăng nhập để mở công cụ" description="Đăng nhập để tiếp tục." callbackUrl="/tools">{null}</LoginGate></div>;
  return (
    <div className="mx-auto max-w-[900px]">
      <PageHero
        eyebrow="CÔNG CỤ"
        title="Công cụ học tiếng Anh"
        description="Các công cụ hỗ trợ tra cứu và chỉnh sửa văn bản."
      />

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Card padding="lg">
          <h2 className="text-[15px] font-extrabold text-ink">Từ điển Anh – Việt</h2>
          <p className="mt-1 text-[13px] text-ink-muted">Tra nghĩa và xem phiên âm IPA.</p>
          <input
            className="mt-3 w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-brand"
            placeholder="Nhập từ tiếng Anh…"
            disabled
          />
          <Button className="mt-3" type="button" variant="outline" disabled>
            Tra cứu (sắp có)
          </Button>
        </Card>

        <Card padding="lg">
          <h2 className="text-[15px] font-extrabold text-ink">Công cụ văn bản</h2>
          <p className="mt-1 text-[13px] text-ink-muted">
            Đếm từ, viết hoa câu và làm sạch khoảng trắng.
          </p>
          <textarea
            className="mt-3 min-h-[100px] w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-brand"
            placeholder="Dán đoạn văn…"
            disabled
          />
          <Button className="mt-3" type="button" variant="outline" disabled>
            Xử lý (sắp có)
          </Button>
        </Card>
      </div>

      <SiteFooter />
    </div>
  );
}
