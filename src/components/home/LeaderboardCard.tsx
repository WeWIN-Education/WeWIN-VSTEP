import { Card } from "@/components/ui/Card";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { SectionTitle } from "@/components/ui/SectionTitle";
import Link from "next/link";

type Entry = {
  id: string;
  name: string;
  level: number;
  xp: number;
};

const MEDALS = ["🥇", "🥈", "🥉"];

export function LeaderboardCard({ entries }: { entries: Entry[] }) {
  return (
    <Card>
      <SectionTitle
        title="Bảng xếp hạng"
        action={
          <Link
            href="/leaderboard"
            className="text-[12px] font-semibold text-brand hover:underline"
          >
            Xem tất cả
          </Link>
        }
      />
      <p className="mb-3 text-[12px] text-ink-muted">Top học viên tuần này</p>
      <ul className="space-y-2.5">
        {entries.map((entry, index) => (
          <li key={entry.id} className="flex items-center gap-2.5">
            <span className="w-5 text-center text-sm">
              {MEDALS[index] ?? index + 1}
            </span>
            <ImageSlot
              label="Avatar"
              aspect="aspect-square"
              className="size-9 shrink-0 rounded-full"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold text-ink">
                {entry.name}
              </div>
              <div className="text-[11px] text-ink-muted">
                Level {entry.level}
              </div>
            </div>
            <div className="text-[12px] font-bold text-brand">
              {entry.xp.toLocaleString("vi-VN")} XP
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
