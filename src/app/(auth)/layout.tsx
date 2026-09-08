import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-full bg-[#f3f4f6]">{children}</div>;
}
