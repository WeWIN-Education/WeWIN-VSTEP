"use client";

import { useEffect, useState } from "react";
import { Cloud, Sparkles } from "lucide-react";

export function ThemeControl() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);

  return (
    <button
      type="button"
      role="switch"
      aria-label="Chế độ tối"
      aria-checked={dark}
      title={dark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
      className="theme-switch"
      onClick={() => {
        const next = !dark;
        setDark(next);
        document.documentElement.dataset.theme = next ? "dark" : "light";
        localStorage.setItem("wewin-theme", next ? "dark" : "light");
      }}
    >
      <span className="theme-switch-track" aria-hidden="true">
        <span className="theme-switch-clouds"><Cloud className="theme-switch-cloud" /><Cloud className="theme-switch-cloud small" /></span>
        <span className="theme-switch-stars"><Sparkles /><i /><i /><i /></span>
        <span className="theme-switch-orb"><i /><i /><i /></span>
      </span>
    </button>
  );
}
