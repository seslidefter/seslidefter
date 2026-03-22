"use client";

import { useEffect } from "react";

const KEY = "sd-theme";

export function applyTheme(mode: "light" | "dark") {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", mode);
  root.classList.toggle("dark", mode === "dark");
}

export function readStoredTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  try {
    const v = localStorage.getItem(KEY);
    return v === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function persistTheme(mode: "light" | "dark") {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* ignore */
  }
  applyTheme(mode);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyTheme(readStoredTheme());
  }, []);
  return children;
}
