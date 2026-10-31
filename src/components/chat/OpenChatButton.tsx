"use client";

import type { ReactNode } from "react";

export const OPEN_CHAT_EVENT = "wewin:open-support";

export function OpenChatButton({ children, className }: { children: ReactNode; className?: string }) {
  return <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(OPEN_CHAT_EVENT))}>{children}</button>;
}
