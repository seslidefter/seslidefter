"use client";

import { Mic } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDashboardVoiceFabStore } from "@/store/dashboardVoiceFabStore";

type NavItem =
  | {
      href: string;
      label: string;
      icon: string;
    }
  | null;

export function MobileNav() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const [hasUrgentPayment, setHasUrgentPayment] = useState(false);

  useEffect(() => {
    async function checkPayments() {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const today = new Date().toISOString().split("T")[0];
      const { count, error } = await supabase
        .from("payment_plan_payments")
        .select("*", { count: "exact", head: true })
        .eq("user_id", session.user.id)
        .eq("is_paid", false)
        .lte("due_date", today);

      if (!error) setHasUrgentPayment((count ?? 0) > 0);
    }
    void checkPayments();
  }, [pathname]);

  const navItems: NavItem[] = [
    { href: "/dashboard", label: t("nav.dashboard"), icon: "🏠" },
    { href: "/islemler", label: t("nav.transactions"), icon: "💸" },
    null,
    { href: "/odemeler", label: t("nav.payments"), icon: "💳" },
    { href: "/profil", label: t("nav.profile"), icon: "👤" },
  ];

  const onFab = () => {
    if (pathname === "/dashboard") {
      useDashboardVoiceFabStore.getState().requestFromFab();
    } else {
      router.push("/dashboard?voice=1");
    }
  };

  return (
    <nav
      className={cn(
        "mobile-nav fixed bottom-0 left-0 right-0 z-40 border-t pb-[env(safe-area-inset-bottom)] pt-2 shadow-[var(--shadow)] backdrop-blur-[10px] backdrop-saturate-150 md:hidden"
      )}
      style={{
        borderColor: "var(--border-color)",
        background: "color-mix(in srgb, var(--bg-card) 92%, transparent)",
      }}
    >
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5 items-center px-1">
        {navItems.map((item) => {
          if (!item) {
            return (
              <div key="fab" className="flex justify-center">
                <button
                  type="button"
                  onClick={onFab}
                  className="sd-fab-pulse sd-gradient relative -top-3 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-transform duration-200 active:scale-95"
                  aria-label={t("dashboard.voiceFab")}
                >
                  <Mic className="h-7 w-7" strokeWidth={2.4} />
                </button>
              </div>
            );
          }

          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-semibold transition-colors",
                active ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-gray-500"
              )}
            >
              {item.href === "/odemeler" && hasUrgentPayment ? (
                <span
                  className="absolute right-2 top-1 h-2.5 w-2.5 rounded-full border-2 border-[var(--bg-card)] bg-red-500 dark:border-[var(--sd-bg)]"
                  aria-hidden
                />
              ) : null}
              <span className="text-xl leading-none" aria-hidden>
                {item.icon}
              </span>
              <span className="max-w-[4.5rem] truncate text-center leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
