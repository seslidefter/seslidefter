"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

type PlanPaymentRow = {
  id: string;
  amount: number;
  due_date: string;
  payment_plans: { title: string; icon: string } | null;
};

export function UpcomingPlanPayments() {
  const [rows, setRows] = useState<PlanPaymentRow[]>([]);

  const load = useCallback(async () => {
    const supabase = getSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setRows([]);
      return;
    }

    const end = new Date();
    end.setDate(end.getDate() + 30);
    const endStr = end.toISOString().split("T")[0];
    const start = new Date();
    start.setDate(start.getDate() - 14);
    const startStr = start.toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("payment_plan_payments")
      .select("id, amount, due_date, payment_plans(title, icon)")
      .eq("user_id", user.id)
      .eq("is_paid", false)
      .gte("due_date", startStr)
      .lte("due_date", endStr)
      .order("due_date", { ascending: true })
      .limit(5);

    if (error) {
      console.warn("[UpcomingPlanPayments]", error.message);
      setRows([]);
      return;
    }

    setRows((data ?? []) as PlanPaymentRow[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (rows.length === 0) return null;

  return (
    <div
      className="mt-4 rounded-2xl border border-black/[0.06] bg-[var(--bg-card)] p-4 dark:border-white/10"
      style={{ boxShadow: "var(--shadow)" }}
    >
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
        ⏰ Yaklaşan ödemeler (plan)
        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600 dark:bg-red-900/40 dark:text-red-300">
          {rows.length}
        </span>
      </h3>
      {rows.slice(0, 3).map((payment) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(payment.due_date + "T12:00:00");
        due.setHours(0, 0, 0, 0);
        const days = Math.ceil((due.getTime() - today.getTime()) / 86400000);
        const title = payment.payment_plans?.title ?? "Ödeme";
        const icon = payment.payment_plans?.icon ?? "💳";
        const urgency =
          days < 0 ? "text-red-500" : days <= 3 ? "text-red-500" : days <= 7 ? "text-amber-500" : "text-[var(--text-secondary)]";
        const dayLabel =
          days === 0
            ? "⚠️ Bugün!"
            : days < 0
              ? `⛔ ${Math.abs(days)} gün gecikti`
              : `${days} gün kaldı`;
        return (
          <div
            key={payment.id}
            className="flex items-center gap-3 border-b border-black/[0.06] py-2.5 last:border-0 dark:border-white/10"
          >
            <span className="text-xl" aria-hidden>
              {icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-[var(--text-primary)]">{title}</div>
              <div className={`mt-0.5 text-xs font-semibold ${urgency}`}>{dayLabel}</div>
            </div>
            <div className="shrink-0 text-sm font-bold text-[var(--text-primary)]">
              ₺{Number(payment.amount).toLocaleString("tr-TR")}
            </div>
          </div>
        );
      })}
    </div>
  );
}
