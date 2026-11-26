"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { trackMainSiteClick, trackPageView } from "@/lib/wewin-analytics";

export function WebAnalytics() {
  const pathname = usePathname();
  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);

  useEffect(() => {
    function onLink(event: MouseEvent) {
      if (event.type === "auxclick" && event.button !== 1) return;
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (target instanceof HTMLAnchorElement) trackMainSiteClick(target);
    }
    document.addEventListener("click", onLink, true);
    document.addEventListener("auxclick", onLink, true);
    return () => {
      document.removeEventListener("click", onLink, true);
      document.removeEventListener("auxclick", onLink, true);
    };
  }, []);

  return null;
}
