import { auth } from "@/auth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import Link from "next/link";
import type { ReactNode } from "react";

type LoginGateProps = {
  title: string;
  description: string;
  children: ReactNode;
};

/** Soft gate: shows login CTA when signed out; otherwise renders children. */
export async function LoginGate({ title, description, children }: LoginGateProps) {
  const session = await auth();
  if (session?.user) return <>{children}</>;

  return (
    <Card padding="lg" className="mx-auto max-w-lg text-center">
      <h1 className="font-[family-name:var(--font-jakarta)] text-xl font-extrabold text-ink">
        {title}
      </h1>
      <p className="mt-2 text-sm text-ink-muted">{description}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Link href="/login">
          <Button>Đăng nhập</Button>
        </Link>
        <Link href="/register">
          <Button variant="outline">Đăng ký</Button>
        </Link>
      </div>
      <p className="mt-4 text-[12px] text-ink-faint">
        Demo: demo@wewin.local / password123
      </p>
    </Card>
  );
}
