"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";
import { LoaderCircle } from "lucide-react";

function PendingIndicator() {
  const { pending } = useLinkStatus();
  return pending ? <span role="status" className="ml-auto inline-flex shrink-0 items-center gap-1 text-brand"><LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /><span className="sr-only">Đang chuyển trang…</span></span> : null;
}

export function NavigationLink({ children, ...props }: ComponentProps<typeof Link>) {
  return <Link {...props}>{children}<PendingIndicator /></Link>;
}
