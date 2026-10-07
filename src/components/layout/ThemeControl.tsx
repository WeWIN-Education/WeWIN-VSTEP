"use client";
import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
type Mode = "light" | "dark" | "system";
export function ThemeControl({ compact = false }: { compact?: boolean }) {
  const [mode, setMode] = useState<Mode | null>(null);
  useEffect(() => {
    const stored = localStorage.getItem("wewin-theme");
    setMode(
      stored === "light" || stored === "dark" || stored === "system"
        ? stored
        : "system",
    );
  }, []);
  useEffect(() => {
    if (!mode) return;
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        mode === "system" ? (media.matches ? "dark" : "light") : mode;
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [mode]);
  const Icon = mode === "dark" ? Moon : mode === "light" ? Sun : Monitor;
  return (
    <label
      className={`relative flex min-h-11 items-center gap-2 rounded-xl border border-border bg-surface-card px-3 text-ink ${compact ? "w-11" : ""}`}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="sr-only">Giao diện</span>
      <select
        aria-label="Giao diện"
        value={mode || "system"}
        onChange={(e) => {
          const next = e.target.value as Mode;
          setMode(next);
          localStorage.setItem("wewin-theme", next);
        }}
        className={
          compact
            ? "absolute inset-0 w-full opacity-0"
            : "w-full min-w-0 bg-transparent py-2 text-xs font-medium"
        }
      >
        <option value="light">Sáng</option>
        <option value="dark">Tối</option>
        <option value="system">Theo thiết bị</option>
      </select>
    </label>
  );
}
