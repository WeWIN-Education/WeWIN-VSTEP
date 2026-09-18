import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getCurrentUser } from "@/lib/access";
import Link from "next/link";
import type { ReactNode } from "react";

type LoginGateProps = {
  title: string;
  description: string;
  children: ReactNode;
  callbackUrl?: string;
};

/** Soft gate: shows login CTA when signed out; otherwise renders children. */
export async function LoginGate({ title, description, children, callbackUrl }: LoginGateProps) {
  const user = await getCurrentUser();
  if (user) return <>{children}</>;

  const loginHref = callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login";

  return (
    <Card padding="lg" className="mx-auto max-w-lg text-center">
      <h1 className="font-[family-name:var(--font-jakarta)] text-xl font-extrabold text-ink">
        {title}
      </h1>
      <p className="mt-2 text-sm text-ink-muted">{description}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Link href={loginHref}>
          <Button>Đăng nhập</Button>
        </Link>
      </div>
      <p className="mt-4 text-[12px] text-ink-faint">
        Tài khoản được trung tâm WEWIN cấp sau khi đăng ký chương trình.
      </p>
    </Card>
  );
}
