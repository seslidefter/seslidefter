"use client";

import { Mic } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useDashboardVoiceFabStore } from "@/store/dashboardVoiceFabStore";

const left = [
  { href: "/dashboard", label: "Ana Sayfa", short: "Ana", emoji: "🏠" },
  { href: "/islemler", label: "İşlemler", short: "İşlem", emoji: "📋" },
  { href: "/odemeler", label: "Ödemeler", short: "Ödeme", emoji: "💳" },
];

const right = [
  { href: "/rapor", label: "Rapor", short: "Rapor", emoji: "📊" },
  { href: "/profil", label: "Profil", short: "Profil", emoji: "👤" },
];

export function MobileNav() {
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
        "fixed bottom-0 left-0 right-0 z-40 min-h-[calc(64px+env(safe-area-inset-bottom))] border-t pb-[env(safe-area-inset-bottom)] pt-2 shadow-[var(--shadow)] backdrop-blur-[10px] backdrop-saturate-150 md:hidden"
      )}
      style={{
        borderColor: "var(--border-color)",
        background: "color-mix(in srgb, var(--bg-card) 92%, transparent)",
      }}
    >
      <div className="relative mx-auto flex max-w-lg items-end justify-between px-1">
        <div className="flex flex-1 justify-around pb-1.5">
          {left.map(({ href, label, short, emoji }) => {
            const isActive =
              href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex min-w-0 flex-col items-center gap-0.5 rounded-xl px-1 py-1 text-[10px] font-bold transition-colors duration-200",
                  isActive ? "text-[var(--sd-primary)]" : "text-[var(--text-secondary)]"
                )}
              >
                {href === "/odemeler" && hasUrgentPayment ? (
                  <span
                    className="absolute right-1 top-0 h-2.5 w-2.5 rounded-full border-2 border-[var(--bg-card)] bg-red-500 dark:border-[var(--sd-bg)]"
                    aria-hidden
                  />
                ) : null}
                <span className="text-lg leading-none" aria-hidden>
                  {emoji}
                </span>
                <span className="max-w-[4.25rem] truncate text-center leading-tight">{short}</span>
                <span className="sr-only">{label}</span>
              </Link>
            );
          })}
        </div>

        <div className="relative -top-6 z-[72] flex shrink-0 px-1">
          <button
            type="button"
            onClick={onFab}
            className="sd-fab-pulse sd-gradient flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-transform duration-200 active:scale-95"
            aria-label="Sesle kayıt"
          >
            <Mic className="h-7 w-7" strokeWidth={2.4} />
          </button>
        </div>

        <div className="flex flex-1 justify-around pb-1.5">
          {right.map(({ href, label, short, emoji }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex min-w-0 flex-col items-center gap-0.5 rounded-xl px-1 py-1 text-[10px] font-bold transition-colors duration-200",
                  active ? "text-[var(--sd-primary)]" : "text-[var(--text-secondary)]"
                )}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {emoji}
                </span>
                <span className="max-w-[4.25rem] truncate text-center leading-tight">{short}</span>
                <span className="sr-only">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
