import { Card } from "@/components/ui/Card";

export default function LoadingLeaderboard() {
  return <div className="mx-auto w-full max-w-[860px] space-y-6" aria-busy="true" aria-label="Đang tải bảng xếp hạng"><div className="h-40 animate-pulse rounded-[24px] bg-brand-soft/60" /><Card padding="lg"><div className="h-7 w-48 animate-pulse rounded bg-surface" /><div className="mt-5 space-y-2">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-14 animate-pulse rounded-2xl bg-surface" />)}</div></Card></div>;
}
