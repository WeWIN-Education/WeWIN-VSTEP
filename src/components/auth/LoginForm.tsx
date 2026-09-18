"use client";

import { loginAction, type AuthFormState } from "@/lib/auth-actions";
import { Button } from "@/components/ui/Button";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { useState } from "react";

const initial: AuthFormState = {};

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initial);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      <div>
        <label htmlFor="login-email" className="mb-1.5 block text-[13px] font-semibold text-ink">
          Email
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="ban@email.com"
          className="h-12 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none ring-brand/30 placeholder:text-ink-faint focus:border-brand focus:ring-2"
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="login-password" className="text-[13px] font-semibold text-ink">Mật khẩu</label>
          <Link href="/contact" className="text-[12px] font-semibold text-brand hover:underline">Cần cấp lại mật khẩu?</Link>
        </div>
        <div className="relative">
          <input
          id="login-password"
          name="password"
          type={showPassword ? "text" : "password"}
          required
          autoComplete="current-password"
          className="h-12 w-full rounded-xl border border-border bg-white px-3 pr-12 text-sm outline-none ring-brand/30 focus:border-brand focus:ring-2"
          />
          <button type="button" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-ink-muted hover:text-brand">
            {showPassword ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Đang đăng nhập…" : "ĐĂNG NHẬP"}
      </Button>

      <p className="text-center text-[13px] text-ink-muted">
        Tài khoản được WEWIN cấp sau khi đăng ký chương trình. Cần hỗ trợ? <Link href="/contact" className="font-semibold text-brand hover:underline">Liên hệ trung tâm</Link>.
      </p>
    </form>
  );
}
