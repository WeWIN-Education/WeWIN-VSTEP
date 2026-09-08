import { auth } from "@/auth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { prisma } from "@/lib/prisma";
import { Flame, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | WEWIN EDUCATION",
};

export default async function DashboardPage() {
  const session = await auth();

  let challenges: { title: string; xpReward: number }[] = [];
  try {
    challenges = await prisma.dailyChallenge.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      take: 3,
    });
  } catch {
    challenges = [
      { title: "Hoàn thành 2 bài học", xpReward: 60 },
      { title: "Ôn 10 từ vựng", xpReward: 60 },
    ];
  }

  return (
    <div className="mx-auto max-w-[900px] space-y-4">
      <Card padding="lg">
        <h1 className="font-[family-name:var(--font-jakarta)] text-xl font-extrabold text-ink">
          Xin chào, {session?.user?.name || session?.user?.email}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Tiếp tục lộ trình Lớp 1 hoặc luyện đề / bài tập hôm nay.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/hsk/lop-1">
            <Button>Tiếp tục Lớp 1</Button>
          </Link>
          <Link href="/hsk-practice">
            <Button variant="outline">Bài tập</Button>
          </Link>
          <Link href="/exam/lop-1">
            <Button variant="outline">Luyện đề</Button>
          </Link>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card padding="lg" className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-xl bg-orange-50 text-accent-orange">
            <Flame className="size-5" />
          </span>
          <div>
            <p className="text-[22px] font-extrabold text-ink">0</p>
            <p className="text-[12px] text-ink-muted">Streak (ngày)</p>
          </div>
        </Card>
        <Card padding="lg" className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Sparkles className="size-5" />
          </span>
          <div>
            <p className="text-[22px] font-extrabold text-ink">0</p>
            <p className="text-[12px] text-ink-muted">XP hôm nay</p>
          </div>
        </Card>
        <Card padding="lg" className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Trophy className="size-5" />
          </span>
          <div>
            <p className="text-[22px] font-extrabold text-ink">1</p>
            <p className="text-[12px] text-ink-muted">Level stub</p>
          </div>
        </Card>
      </div>

      <Card padding="lg">
        <h2 className="text-sm font-bold text-ink">Thử thách hôm nay</h2>
        <ul className="mt-3 space-y-2">
          {challenges.map((c) => (
            <li
              key={c.title}
              className="flex items-center justify-between rounded-xl bg-surface px-3 py-2 text-[13px]"
            >
              <span className="font-medium text-ink">{c.title}</span>
              <span className="font-bold text-brand">+{c.xpReward} XP</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
