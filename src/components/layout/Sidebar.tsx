"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

function initialsFromEmailOrName(s: string) {
  const t = s.trim();
  if (!t) return "?";
  if (t.includes("@")) return t[0]!.toUpperCase();
  const p = t.split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? "?") + (p[1]?.[0] ?? "")).toLocaleUpperCase("tr-TR");
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  const nav = [
    { href: "/dashboard", label: t("nav.dashboard"), emoji: "🏠" },
    { href: "/islemler", label: t("nav.transactions"), emoji: "💸" },
    { href: "/alacak-verecek", label: t("nav.debtCredit"), emoji: "👥" },
    { href: "/odemeler", label: t("nav.payments"), emoji: "💳" },
    { href: "/profil", label: t("nav.profile"), emoji: "👤" },
  ];

  const display =
    (user?.user_metadata?.full_name as string | undefined)?.trim() ||
    user?.email?.split("@")[0] ||
    "Hesap";

  const email = user?.email ?? "";

  return (
    <aside
      className="sidebar sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col border-r md:flex"
      style={{ borderColor: "var(--border-color)", background: "var(--bg-card)" }}
    >
      <div className="flex h-full flex-col">
        <Link href="/dashboard" prefetch className="sidebar-logo block border-b border-white/10">
          <div className="logo-bg">
            <div className="deco-circle deco-1" />
            <div className="deco-circle deco-2" />
            <div className="deco-circle deco-3" />
          </div>
          <div className="logo-content">
            <span className="logo-emoji" aria-hidden>
              📒
            </span>
            <span className="logo-text">{t("common.appName")}</span>
          </div>
        </Link>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          {nav.map(({ href, label, emoji }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                prefetch
                className={cn(
                  "flex items-center gap-3 rounded-xl border-l-[3px] border-transparent py-3 pl-4 pr-3 text-sm font-bold transition-all duration-200",
                  active
                    ? "border-l-[var(--sd-primary)] bg-[color-mix(in_srgb,var(--sd-primary)_10%,white)] text-[var(--sd-primary)]"
                    : "text-[var(--text-secondary)] hover:border-l-[var(--border-color)] hover:bg-[color-mix(in_srgb,var(--bg-primary)_85%,var(--text-primary))]"
                )}
              >
                <span className="text-lg" aria-hidden>
                  {emoji}
                </span>
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-black/[0.06] p-4">
          <div className="flex items-center gap-3">
            <div
              suppressHydrationWarning
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--sd-primary)_15%,white)] text-sm font-extrabold text-[var(--sd-primary)]"
            >
              {initialsFromEmailOrName(display)}
            </div>
            <div className="min-w-0 flex-1">
              <p suppressHydrationWarning className="truncate text-sm font-bold text-[var(--text-primary)]">
                {display}
              </p>
              {email ? (
                <p suppressHydrationWarning className="truncate text-xs font-medium text-[var(--text-secondary)]">
                  {email}
                </p>
              ) : null}
            </div>
          </div>
          <div className="mt-3">
            <ThemeToggle className="w-full justify-center" />
          </div>
          <button
            type="button"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-bold text-[var(--sd-gider)] transition-all duration-200 hover:opacity-90"
            style={{ borderColor: "var(--border-color)" }}
            onClick={() => void signOut().then(() => router.push("/login"))}
          >
            <LogOut className="h-4 w-4" strokeWidth={2.25} />
            {t("profile.logout")}
          </button>
        </div>
      </div>
    </aside>
  );
}
