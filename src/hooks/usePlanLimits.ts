"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FREE_LIMITS, PREMIUM_LIMITS } from "@/lib/plan-limits";

export { FREE_LIMITS, PREMIUM_LIMITS } from "@/lib/plan-limits";

export interface PlanLimits {
  plan: "free" | "premium";
  isPremium: boolean;
  premiumUntil: Date | null;
  monthlyUsed: number;
  monthlyLimit: number;
  usagePercent: number;
  isLimitReached: boolean;
  contactsUsed: number;
  paymentPlansUsed: number;
  aiQueriesUsed: number;
  limits: typeof FREE_LIMITS | typeof PREMIUM_LIMITS;
  daysRemaining: number | null;
  joinDate: Date;
}

export function usePlanLimits() {
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
    const premiumUntil = profile?.premium_until ? new Date(profile.premium_until) : null;
    const isPremium =
      (premiumUntil != null && premiumUntil.getTime() > now.getTime()) || profile?.plan === "premium";
    const limits = isPremium ? PREMIUM_LIMITS : FREE_LIMITS;
    const monthlyUsed = txCountRes.count ?? 0;
    const monthlyLimit = limits.monthlyTransactions;
    const daysRemaining =
      premiumUntil && premiumUntil.getTime() > now.getTime()
        ? Math.ceil((premiumUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;

    const usagePercent =
      monthlyLimit === Number.POSITIVE_INFINITY
        ? 0
        : Math.min((monthlyUsed / monthlyLimit) * 100, 100);

    setPlanData({
      plan: isPremium ? "premium" : "free",
      isPremium,
      premiumUntil,
      monthlyUsed,
      monthlyLimit: monthlyLimit === Number.POSITIVE_INFINITY ? 999_999 : monthlyLimit,
      usagePercent,
      isLimitReached: !isPremium && monthlyUsed >= FREE_LIMITS.monthlyTransactions,
      contactsUsed: contactCountRes.count ?? 0,
      paymentPlansUsed,
      aiQueriesUsed: 0,
      limits,
      daysRemaining,
      joinDate: profile?.created_at ? new Date(profile.created_at) : now,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadPlanData();
  }, [loadPlanData]);

  return { planData, loading, refresh: loadPlanData };
}
