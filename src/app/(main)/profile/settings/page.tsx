import { auth } from "@/auth";
import { Card } from "@/components/ui/Card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cài đặt | WEWIN EDUCATION",
};

export default async function SettingsPage() {
  const session = await auth();

  return (
    <div className="mx-auto max-w-[720px]">
      <Card padding="lg">
        <h1 className="font-[family-name:var(--font-jakarta)] text-xl font-extrabold text-ink">
          Cài đặt tài khoản
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Stub Phase 2 — thông tin tài khoản hiện tại.
        </p>
        <dl className="mt-5 space-y-3 text-sm">
          <div className="flex justify-between border-b border-border pb-2">
            <dt className="text-ink-muted">Tên</dt>
            <dd className="font-semibold text-ink">
              {session?.user?.name || "—"}
            </dd>
          </div>
          <div className="flex justify-between border-b border-border pb-2">
            <dt className="text-ink-muted">Email</dt>
            <dd className="font-semibold text-ink">
              {session?.user?.email || "—"}
            </dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
