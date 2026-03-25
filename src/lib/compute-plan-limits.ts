import { FREE_LIMITS, PREMIUM_LIMITS, type PlanLimits } from "@/lib/plan-limits";

type ProfileRow = {
  plan?: string | null;
  premium_until?: string | null;
  created_at?: string;
} | null;

export function computePlanLimits(
  profile: ProfileRow,
  monthlyUsed: number,
  contactsUsed: number,
  paymentPlansUsed: number,
  now = new Date()
): PlanLimits {
  const premiumUntil = profile?.premium_until ? new Date(profile.premium_until) : null;
  const isPremium =
    (premiumUntil != null && premiumUntil.getTime() > now.getTime()) || profile?.plan === "premium";
  const limits = isPremium ? PREMIUM_LIMITS : FREE_LIMITS;
  const monthlyLimit = limits.monthlyTransactions;
  const daysRemaining =
    premiumUntil && premiumUntil.getTime() > now.getTime()
      ? Math.ceil((premiumUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

  const usagePercent =
    monthlyLimit === Number.POSITIVE_INFINITY ? 0 : Math.min((monthlyUsed / monthlyLimit) * 100, 100);

  return {
    plan: isPremium ? "premium" : "free",
    isPremium,
    premiumUntil,
    monthlyUsed,
    monthlyLimit: monthlyLimit === Number.POSITIVE_INFINITY ? 999_999 : monthlyLimit,
    usagePercent,
    isLimitReached: !isPremium && monthlyUsed >= FREE_LIMITS.monthlyTransactions,
    contactsUsed,
    paymentPlansUsed,
    aiQueriesUsed: 0,
    limits,
    daysRemaining,
    joinDate: profile?.created_at ? new Date(profile.created_at) : now,
  };
}
