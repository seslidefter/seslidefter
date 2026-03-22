"use client";

import { cn } from "@/lib/utils";
import { persistTheme, readStoredTheme } from "@/components/providers/theme-provider";
import { useEffect, useState } from "react";

export function ThemeToggle({ className }: { className?: string }) {
  const [mode, setMode] = useState<"light" | "dark">("light");

  useEffect(() => {
    setMode(readStoredTheme());
  }, []);

  const set = (m: "light" | "dark") => {
    setMode(m);
    persistTheme(m);
  };

  return (
    <div
      className={cn(
        "inline-flex w-full max-w-full rounded-full border p-1",
        className
      )}
      style={{
        borderColor: "var(--border-color)",
        background: "var(--bg-secondary)",
      }}
      role="group"
      aria-label="Tema"
    >
      <button
        type="button"
        onClick={() => set("light")}
        className={cn(
          "min-w-0 flex-1 rounded-full px-3 py-2 text-xs font-bold transition-all",
          mode === "light" ? "sd-gradient text-white shadow-sm" : "text-[var(--text-secondary)]"
        )}
      >
        ☀️ Açık
      </button>
      <button
        type="button"
        onClick={() => set("dark")}
        className={cn(
          "min-w-0 flex-1 rounded-full px-3 py-2 text-xs font-bold transition-all",
          mode === "dark"
            ? "bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-sm"
            : "text-[var(--text-secondary)]"
        )}
      >
        🌙 Koyu
      </button>
    </div>
  );
}
