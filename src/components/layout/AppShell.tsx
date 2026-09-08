import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full bg-surface">
      <Sidebar />
      <div className="pl-[var(--sidebar-width)]">
        <Header />
        <main className="min-h-[calc(100vh-var(--header-height))] px-4 py-4 md:px-6 md:py-5">
          {children}
        </main>
      </div>
    </div>
  );
}
