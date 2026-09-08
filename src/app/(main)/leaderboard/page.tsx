import { SiteFooter } from "@/components/layout/SiteFooter";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import { prisma } from "@/lib/prisma";
import { Trophy } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bảng xếp hạng | WEWIN EDUCATION",
};

export default async function LeaderboardPage() {
  let entries: { id: string; name: string; level: number; xp: number }[] = [];
  try {
    entries = await prisma.leaderboardEntry.findMany({
      orderBy: [{ xp: "desc" }, { sortOrder: "asc" }],
      take: 20,
    });
  } catch {
    entries = [
      { id: "1", name: "Trang Minh", level: 43, xp: 12500 },
      { id: "2", name: "van tran", level: 11, xp: 3200 },
    ];
  }

  return (
    <div className="mx-auto max-w-[800px]">
      <PageHero
        eyebrow="CỘNG ĐỒNG"
        title="Bảng xếp hạng"
        description="Top học viên theo XP tuần này (dữ liệu demo)."
      />

      <Card className="mt-5 overflow-hidden" padding="none">
        <ul className="divide-y divide-border">
          {entries.map((e, i) => (
            <li key={e.id} className="flex items-center gap-3 px-4 py-3">
              <span
                className={`inline-flex size-8 items-center justify-center rounded-full text-sm font-bold ${
                  i === 0
                    ? "bg-accent-orange text-white"
                    : i < 3
                      ? "bg-brand text-white"
                      : "bg-surface text-ink-muted"
                }`}
              >
                {i < 3 ? <Trophy className="size-3.5" /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-extrabold text-ink">{e.name}</p>
                <p className="text-[12px] text-ink-muted">Level {e.level}</p>
              </div>
              <p className="text-[14px] font-extrabold text-brand">{e.xp.toLocaleString()} XP</p>
            </li>
          ))}
        </ul>
      </Card>

      <SiteFooter />
    </div>
  );
}
