"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./landing.module.css";

export function LandingMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const elements = Array.from(root.current?.querySelectorAll<HTMLElement>("[data-reveal]") ?? []);
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (preference.matches || !("IntersectionObserver" in window)) return;

    const reveal = (element: HTMLElement) => {
      element.dataset.revealState = "visible";
      observer.unobserve(element);
    };
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) reveal(entry.target as HTMLElement);
      }
    }, { rootMargin: "0px 0px -32px 0px", threshold: 0 });

    // Keep the first viewport immediately readable, including restored scroll positions.
    const positions = elements.map(element => element.getBoundingClientRect());
    elements.forEach((element, index) => {
      if (positions[index].top >= window.innerHeight) {
        element.dataset.revealState = "pending";
        observer.observe(element);
      }
    });

    const showAll = () => {
      if (!preference.matches) return;
      observer.disconnect();
      elements.forEach(element => element.removeAttribute("data-reveal-state"));
    };
    const showFocused = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const element = target.closest<HTMLElement>("[data-reveal]");
      if (element) reveal(element);
    };
    const container = root.current;
    container?.addEventListener("focusin", showFocused);
    preference.addEventListener("change", showAll);
    return () => {
      observer.disconnect();
      container?.removeEventListener("focusin", showFocused);
      preference.removeEventListener("change", showAll);
      elements.forEach(element => element.removeAttribute("data-reveal-state"));
    };
  }, []);

  return <div ref={root} className={styles.page}>{children}</div>;
}
