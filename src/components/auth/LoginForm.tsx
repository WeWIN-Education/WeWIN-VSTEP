"use client";

import { loginAction, type AuthFormState } from "@/lib/auth-actions";
import { Button } from "@/components/ui/Button";
import { AlertCircle, ArrowRight, Eye, EyeOff, LoaderCircle, LogIn } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { useEffect, useRef, useState } from "react";

const initial: AuthFormState = {};

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initial);
  const [showPassword, setShowPassword] = useState(false);
  const error = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (state.error) error.current?.focus(); }, [state]);

  return (
    <form action={formAction} className="space-y-5" aria-busy={pending}>
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
          aria-describedby={state.error ? "login-error" : undefined}
          className="h-12 w-full rounded-xl border border-border bg-surface px-3 text-base outline-none ring-brand/30 placeholder:text-ink-faint focus:border-brand focus:ring-2"
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
          aria-describedby={state.error ? "login-error" : undefined}
          className="h-12 w-full rounded-xl border border-border bg-surface px-3 pr-12 text-base outline-none ring-brand/30 focus:border-brand focus:ring-2"
          />
          <button type="button" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-xl text-ink-muted hover:text-brand">
            {showPassword ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {state.error ? (
        <p ref={error} id="login-error" role="alert" tabIndex={-1} className="flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 px-3 py-3 text-[13px] text-red-800">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full bg-[#004aad] text-white hover:bg-[#003a8c] active:scale-[.98] motion-reduce:active:scale-100" disabled={pending}>
        {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <LogIn className="size-4" aria-hidden="true" />}
        {pending ? "Đang đăng nhập…" : "Đăng nhập"}
      </Button>

      <p className="text-center text-[13px] text-ink-muted">
        Tài khoản do trung tâm cấp. Cần hỗ trợ? <Link href="/contact" className="inline-flex min-h-11 items-center font-semibold text-brand hover:underline">Liên hệ WEWIN</Link>.
      </p>
      <div className="border-t border-border pt-4 text-center"><p className="text-xs text-ink-muted">Bạn muốn trải nghiệm trước?</p><Link href="/exam/vstep" className="mt-1 inline-flex min-h-11 items-center justify-center gap-2 text-sm font-semibold text-brand">Học thử không cần tài khoản <ArrowRight size={16} aria-hidden="true" /></Link></div>
    </form>
  );
}
