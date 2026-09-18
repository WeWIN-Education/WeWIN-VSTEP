import { VstepTargetForm } from "@/components/gamification/VstepTargetForm";
import { Card } from "@/components/ui/Card";
import { getCurrentUser } from "@/lib/access";
import { getGamificationSummary } from "@/lib/gamification";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Cài đặt | WEWIN EDUCATION" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/profile/settings");
  const summary = await getGamificationSummary(user.id);

  return (
    <div className="mx-auto max-w-[720px]">
      <Card padding="lg">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-brand">TÀI KHOẢN</p>
        <h1 className="mt-1 font-[family-name:var(--font-jakarta)] text-xl font-extrabold text-ink">Cài đặt tài khoản</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">Cập nhật mục tiêu học tập để WEWIN hiển thị tiến độ VSTEP phù hợp với bạn.</p>
        <dl className="mt-5 space-y-3 text-sm">
          <div className="flex flex-wrap justify-between gap-2 border-b border-border pb-2"><dt className="text-ink-muted">Tên</dt><dd className="font-semibold text-ink">{user.name || "—"}</dd></div>
          <div className="flex flex-wrap justify-between gap-2 border-b border-border pb-2"><dt className="text-ink-muted">Email</dt><dd className="font-semibold text-ink">{user.email || "—"}</dd></div>
        </dl>
        <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-surface p-3 text-center">
          <div><p className="text-lg font-extrabold text-ink">{summary.xp}</p><p className="text-[11px] text-ink-muted">XP</p></div>
          <div><p className="text-lg font-extrabold text-ink">{summary.streakDays}</p><p className="text-[11px] text-ink-muted">Ngày liên tục</p></div>
          <div><p className="text-lg font-extrabold text-ink">{summary.heartsReceived}</p><p className="text-[11px] text-ink-muted">Tim nhận được</p></div>
        </div>
        <VstepTargetForm initialTarget={summary.target} />
      </Card>
    </div>
  );
}
