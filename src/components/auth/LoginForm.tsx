"use client";

import { loginAction, type AuthFormState } from "@/lib/auth-actions";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { useActionState } from "react";

const initial: AuthFormState = {};

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-white text-xs font-semibold text-ink-muted"
        >
          <span className="text-sm font-bold text-[#4285F4]">G</span>
          ĐĂNG NHẬP VỚI GOOGLE
        </button>
        <button
          type="button"
          disabled
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-white text-xs font-semibold text-ink-muted"
        >
          <span className="text-sm"></span>
          ĐĂNG NHẬP VỚI APPLE
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[11px] font-semibold tracking-wide text-ink-faint">
          HOẶC
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-ink">
          Email
        </label>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="ban@email.com"
          className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none ring-brand/30 placeholder:text-ink-faint focus:ring-2"
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-[13px] font-semibold text-ink">Mật khẩu</label>
          <span className="text-[12px] font-semibold text-brand/70">
            Quên mật khẩu?
          </span>
        </div>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none ring-brand/30 focus:ring-2"
        />
      </div>

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Đang đăng nhập..." : "ĐĂNG NHẬP"}
      </Button>

      <p className="text-center text-[13px] text-ink-muted">
        Chưa có tài khoản?{" "}
        <Link href="/register" className="font-semibold text-accent-orange hover:underline">
          Đăng ký miễn phí
        </Link>
      </p>
    </form>
  );
}
