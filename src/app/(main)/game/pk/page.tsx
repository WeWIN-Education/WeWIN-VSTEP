import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PK đối kháng | WEWIN EDUCATION",
};

export default function GamePkPage() {
  return (
    <div className="mx-auto max-w-[800px]">
      <Link
        href="/game"
        className="mb-3 inline-block text-[13px] font-semibold text-brand hover:underline"
      >
        ← Trò chơi
      </Link>
      <PageHero
        eyebrow="GAME · STUB"
        title="PK đối kháng"
        description="Ghép trận thời gian thực sẽ bổ sung sau. Hiện tại là giao diện placeholder."
      />

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Card padding="lg" className="text-center">
          <p className="text-[12px] font-bold text-ink-muted">Bạn</p>
          <p className="mt-2 text-4xl font-extrabold text-brand">0</p>
          <p className="text-[13px] text-ink-muted">điểm</p>
        </Card>
        <Card padding="lg" className="text-center">
          <p className="text-[12px] font-bold text-ink-muted">Đối thủ</p>
          <p className="mt-2 text-4xl font-extrabold text-ink-faint">—</p>
          <p className="text-[13px] text-ink-muted">đang tìm…</p>
        </Card>
      </div>

      <Card className="mt-4 text-center" padding="lg">
        <p className="text-sm text-ink-muted">
          Matchmaking realtime chưa bật. Bạn có thể luyện gõ từ trước.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Button type="button" disabled>
            Tìm trận (sắp có)
          </Button>
          <Link href="/game/typing">
            <Button variant="outline">Chơi gõ từ</Button>
          </Link>
        </div>
      </Card>

      <SiteFooter />
    </div>
  );
}
