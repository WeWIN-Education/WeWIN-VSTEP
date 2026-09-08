import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import { Keyboard, Swords } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trò chơi | WEWIN EDUCATION",
};

const GAMES = [
  {
    href: "/game/typing",
    title: "Gõ từ tiếng Anh",
    description: "Gõ đúng từ xuất hiện trên màn hình — luyện tốc độ và chính tả.",
    icon: Keyboard,
    ready: true,
  },
  {
    href: "/game/pk",
    title: "PK đối kháng",
    description: "Thách đấu bạn bè theo thời gian thực (UI stub — realtime sẽ bổ sung).",
    icon: Swords,
    ready: false,
  },
];

export default function GameIndexPage() {
  return (
    <div className="mx-auto max-w-[900px]">
      <PageHero
        eyebrow="TRÒ CHƠI"
        title="Học mà chơi"
        description="Game ngắn giúp ôn từ vựng và phản xạ — phù hợp học sinh tiểu học."
      />

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {GAMES.map((g) => {
          const Icon = g.icon;
          return (
            <Card key={g.href} padding="lg" className="flex flex-col">
              <span className="inline-flex size-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Icon className="size-5" />
              </span>
              <h2 className="mt-3 font-[family-name:var(--font-jakarta)] text-[16px] font-extrabold text-ink">
                {g.title}
              </h2>
              <p className="mt-2 flex-1 text-[13px] text-ink-muted">{g.description}</p>
              <Link href={g.href} className="mt-4 block">
                <Button className="w-full" variant={g.ready ? "primary" : "outline"}>
                  {g.ready ? "Chơi ngay" : "Xem stub"}
                </Button>
              </Link>
            </Card>
          );
        })}
      </div>

      <SiteFooter />
    </div>
  );
}
