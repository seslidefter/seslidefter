"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuthStore } from "@/store/authStore";

export function Header() {
  const { t, language } = useLanguage();
  const user = useAuthStore((s) => s.user);

  const dateLine = useMemo(() => {
    const locale = language === "en" ? "en-US" : "tr-TR";
    return new Date().toLocaleDateString(locale, {
      day: "numeric",
      month: "long",
      weekday: "long",
    });
  }, [language]);

  return (
    <header
      className="sticky top-0 z-20 border-b px-4 py-3 backdrop-blur-md md:px-8"
      style={{
        borderColor: "var(--border-color)",
        background: "color-mix(in srgb, var(--bg-card) 88%, transparent)",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold capitalize text-[var(--text-secondary)] md:text-base">
            {dateLine}
          </p>
        </div>
        {user ? (
          <Link
            href="/profil"
            className="shrink-0 rounded-xl px-3 py-2 text-sm font-bold text-[var(--sd-primary)] hover:bg-[color-mix(in_srgb,var(--sd-primary)_10%,var(--bg-secondary))] md:hidden"
          >
            {t("nav.profile")}
          </Link>
        ) : null}
      </div>
    </header>
  );
}
