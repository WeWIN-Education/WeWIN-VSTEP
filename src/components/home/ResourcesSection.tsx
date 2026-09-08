import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { BookOpen, FileQuestion, GraduationCap, Library } from "lucide-react";
import Link from "next/link";

type Stat = {
  key: string;
  label: string;
  value: string;
};

const ICONS = {
  lessons: Library,
  vocab: BookOpen,
  exams: FileQuestion,
  levels: GraduationCap,
} as const;

export function ResourcesSection({ stats }: { stats: Stat[] }) {
  return (
    <Card>
      <SectionTitle title="Kho học liệu" />
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => {
          const Icon =
            ICONS[stat.key as keyof typeof ICONS] ?? GraduationCap;
          return (
            <div
              key={stat.key}
              className="rounded-xl border border-border/70 bg-surface px-3 py-3"
            >
              <Icon className="mb-2 size-4 text-brand" />
              <div className="font-[family-name:var(--font-jakarta)] text-xl font-extrabold text-ink">
                {stat.value}
              </div>
              <div className="text-[12px] text-ink-muted">{stat.label}</div>
            </div>
          );
        })}
      </div>
      <Link
        href="/hsk"
        className="mt-4 inline-flex text-[13px] font-semibold text-brand hover:underline"
      >
        Xem toàn bộ lộ trình học →
      </Link>
    </Card>
  );
}
