"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { computePlanLimits } from "@/lib/compute-plan-limits";
import { createClient } from "@/lib/supabase/client";
import { FREE_LIMITS, PREMIUM_LIMITS, type PlanLimits } from "@/lib/plan-limits";
import { useTransactionStore } from "@/store/transactionStore";

export { FREE_LIMITS, PREMIUM_LIMITS, type PlanLimits } from "@/lib/plan-limits";

export function usePlanLimits() {
  const pathname = usePathname();
  const planLimitsPrefetch = useTransactionStore((s) => s.planLimitsPrefetch);
  const txLoading = useTransactionStore((s) => s.loading);
  const [planData, setPlanData] = useState<PlanLimits | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPlanData = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setPlanData(null);
      setLoading(false);
      return;
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [profileRes, txCountRes, contactCountRes, planCountRes] = await Promise.all([
      supabase.from("profiles").select("plan, premium_until, created_at").eq("id", user.id).maybeSingle(),
      supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", monthStart),
      supabase.from("contacts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("payment_plans").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);

    const paymentPlansUsed = planCountRes.error ? 0 : (planCountRes.count ?? 0);
    const profile = profileRes.data as
      | { plan?: string | null; premium_until?: string | null; created_at?: string }
      | null
      | undefined;

    const monthlyUsed = txCountRes.count ?? 0;
    const contactsUsed = contactCountRes.count ?? 0;

    setPlanData(
      computePlanLimits(profile ?? null, monthlyUsed, contactsUsed, paymentPlansUsed, now)
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    if (pathname?.startsWith("/profil")) {
      setLoading(true);
      void loadPlanData();
      return;
    }
    const onDashboard = pathname === "/dashboard" || pathname?.startsWith("/dashboard/");
    if (onDashboard) {
      if (planLimitsPrefetch) {
        setPlanData(planLimitsPrefetch);
        setLoading(false);
        return;
      }
      if (txLoading) {
        setLoading(true);
        return;
      }
      void loadPlanData();
      return;
    }
    void loadPlanData();
  }, [pathname, planLimitsPrefetch, txLoading, loadPlanData]);

  return { planData, loading, refresh: loadPlanData };
}
