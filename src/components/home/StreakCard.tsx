import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Flame } from "lucide-react";

const DAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export function StreakCard() {
  return (
    <Card className="h-full">
      <SectionTitle title="Chuỗi ngày học" />
      <div className="flex items-center gap-3">
        <div className="flex size-14 items-center justify-center rounded-full bg-[#fff4e5] text-accent-orange">
          <Flame className="size-7 fill-current" />
        </div>
        <div>
          <div className="font-[family-name:var(--font-jakarta)] text-[28px] font-extrabold leading-none text-ink">
            0
            <span className="ml-1 text-sm font-semibold text-ink-muted">
              ngày liên tiếp
            </span>
          </div>
          <p className="mt-1 text-[12px] text-ink-muted">
            Học mỗi ngày để giữ chuỗi streak và ghi nhớ lâu hơn.
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {DAYS.map((day) => (
          <div
            key={day}
            className="flex flex-col items-center gap-1 rounded-lg bg-surface px-1 py-2"
          >
            <span className="text-[10px] font-medium text-ink-faint">{day}</span>
            <span className="size-2 rounded-full bg-border" />
          </div>
        ))}
      </div>
      <Button className="mt-4 w-full" size="md">
        BẮT ĐẦU CHUỖI CỦA BẠN
      </Button>
    </Card>
  );
}
