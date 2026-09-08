import { LoginGate } from "@/components/auth/LoginGate";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Giới thiệu bạn bè | WEWIN EDUCATION",
};

export default function AffiliatePage() {
  return (
    <div className="mx-auto max-w-[800px]">
      <LoginGate
        title="Chương trình giới thiệu"
        description="Đăng nhập để nhận mã giới thiệu và theo dõi hoa hồng."
      >
        <PageHero
          eyebrow="GIỚI THIỆU"
          title="Giới thiệu bạn bè"
          description="Chia sẻ WEWIN — nhận ưu đãi khi bạn bè đăng ký Premium (stub)."
        />

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Bạn đã mời", value: "0" },
            { label: "Đăng ký thành công", value: "0" },
            { label: "Điểm thưởng", value: "0" },
          ].map((s) => (
            <Card key={s.label} padding="lg" className="text-center">
              <p className="text-[22px] font-extrabold text-brand">{s.value}</p>
              <p className="text-[12px] text-ink-muted">{s.label}</p>
            </Card>
          ))}
        </div>

        <Card className="mt-4" padding="lg">
          <p className="text-[12px] font-bold uppercase text-ink-muted">Mã giới thiệu demo</p>
          <p className="mt-2 font-mono text-lg font-bold text-ink">WEWIN-DEMO</p>
          <Button className="mt-4" type="button" variant="outline">
            Sao chép link
          </Button>
        </Card>
      </LoginGate>
      <SiteFooter />
    </div>
  );
}
