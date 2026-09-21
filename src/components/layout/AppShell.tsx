import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { getCurrentUser } from "@/lib/access";
import { MobileNavigation } from "@/components/layout/MobileNavigation";
import type { ReactNode } from "react";

export async function AppShell({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-full bg-surface">
      <Header user={user} />
      <div className="flex w-full min-w-0">
        <Sidebar user={user} />
        <main className="min-w-0 w-full max-w-[100vw] flex-1 overflow-x-hidden px-4 py-4 pb-[calc(5rem+env(safe-area-inset-bottom))] md:px-6 md:pt-5 lg:pb-5">
          {children}
        </main>
      </div>
      <MobileNavigation role={user?.role ?? null} />
    </div>
  );
}
