import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";

type Challenge = {
  id: string;
  title: string;
  targetCount: number;
  xpReward: number;
};

export function DailyChallengesCard({
  challenges,
}: {
  challenges: Challenge[];
}) {
  const totalXp = challenges.reduce((sum, c) => sum + c.xpReward, 0);

  return (
    <Card>
      <SectionTitle title="Thử thách hằng ngày" />
      <ul className="space-y-3">
        {challenges.map((challenge) => (
          <li key={challenge.id}>
            <div className="mb-1 flex items-center justify-between gap-2 text-[12.5px]">
              <span className="font-medium text-ink">{challenge.title}</span>
              <span className="text-ink-faint">
                0/{challenge.targetCount}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface">
              <div className="h-full w-0 rounded-full bg-brand" />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[12px] font-medium text-accent-orange">
        Hoàn thành tất cả để nhận {totalXp} XP mỗi ngày!
      </p>
    </Card>
  );
}
