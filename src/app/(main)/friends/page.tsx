import { LoginGate } from "@/components/auth/LoginGate";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import { UserPlus } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bạn bè | WEWIN EDUCATION",
};

export default function FriendsPage() {
  return (
    <div className="mx-auto max-w-[800px]">
      <LoginGate
        title="Bạn bè"
        description="Đăng nhập để xem danh sách bạn bè, lời mời và xếp hạng nhóm."
      >
        <PageHero
          eyebrow="CỘNG ĐỒNG"
          title="Bạn bè"
          description="Kết nối bạn học, thi đua streak và XP (demo UI)."
        />

        <Card className="mt-5" padding="lg">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <UserPlus className="size-5" />
            </span>
            <div className="flex-1">
              <p className="text-[14px] font-extrabold text-ink">Mời bạn học cùng</p>
              <p className="text-[13px] text-ink-muted">Gửi link giới thiệu hoặc tìm theo email.</p>
            </div>
            <Button type="button" variant="outline" size="sm">
              Mời
            </Button>
          </div>
        </Card>

        <Card className="mt-3" padding="lg">
          <p className="text-sm text-ink-muted">
            Chưa có bạn bè trong tài khoản demo. Tính năng đồng bộ sẽ bổ sung sau.
          </p>
        </Card>
      </LoginGate>
      <SiteFooter />
    </div>
  );
}
