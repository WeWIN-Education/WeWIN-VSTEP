"use client";

import { registerAction, type AuthFormState } from "@/lib/auth-actions";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { useActionState } from "react";

const initial: AuthFormState = {};

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-white text-xs font-semibold text-ink-muted"
        >
          <span className="text-sm font-bold text-[#4285F4]">G</span>
          ĐĂNG KÝ VỚI GOOGLE
        </button>
        <button
          type="button"
          disabled
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-white text-xs font-semibold text-ink-muted"
        >
          <span className="text-sm"></span>
          ĐĂNG KÝ VỚI APPLE
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[11px] font-semibold tracking-wide text-ink-faint">
          HOẶC VỚI EMAIL
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-ink">
            Tên hiển thị
          </label>
          <input
            name="name"
            type="text"
            required
            autoComplete="name"
            placeholder="Lan Anh"
            className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none ring-brand/30 placeholder:text-ink-faint focus:ring-2"
          />
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
          <label className="mb-1.5 block text-[13px] font-semibold text-ink">
            Mật khẩu
          </label>
          <input
            name="password"
            type="password"
            required
            autoComplete="new-password"
            className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none ring-brand/30 focus:ring-2"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-ink">
            Xác nhận mật khẩu
          </label>
          <input
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none ring-brand/30 focus:ring-2"
          />
        </div>
      </div>

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Đang tạo tài khoản..." : "TẠO TÀI KHOẢN"}
      </Button>

      <p className="text-center text-[12px] leading-relaxed text-ink-muted">
        Bằng việc đăng ký, bạn đồng ý với{" "}
        <Link href="/legal/terms" className="font-semibold text-brand hover:underline">
          Điều khoản
        </Link>{" "}
        và{" "}
        <Link href="/legal/privacy" className="font-semibold text-brand hover:underline">
          Chính sách bảo mật
        </Link>
        .
      </p>

      <p className="text-center text-[13px] text-ink-muted">
        Đã có tài khoản?{" "}
        <Link href="/login" className="font-semibold text-accent-orange hover:underline">
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}
