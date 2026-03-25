import { createClient } from "@/lib/supabase/client";

type SB = ReturnType<typeof createClient>;

export const FREE_LIMITS = {
  monthlyTransactions: 50,
  contacts: 10,
  paymentPlans: 3,
  aiQueries: 5,
  exportEnabled: false,
  ocrEnabled: false,
  whatsappEnabled: false,
  recurringEnabled: false,
  multiAccountEnabled: false,
} as const;

export const PREMIUM_LIMITS = {
  monthlyTransactions: Number.POSITIVE_INFINITY,
  contacts: Number.POSITIVE_INFINITY,
  paymentPlans: Number.POSITIVE_INFINITY,
  aiQueries: Number.POSITIVE_INFINITY,
  exportEnabled: true,
  ocrEnabled: true,
  whatsappEnabled: true,
  recurringEnabled: true,
  multiAccountEnabled: true,
} as const;

export type PlanKind = "free" | "premium";

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

export interface MonthlyLimitCheck {
  ok: boolean;
  isPremium: boolean;
  monthlyUsed: number;
  monthlyLimit: number;
  message: string | null;
}

/** Ay başından beri oluşturulan işlem sayısına göre limit (free: 50) */
export async function checkMonthlyTransactionLimit(
  supabase: SB,
  userId: string
): Promise<MonthlyLimitCheck> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [profileRes, txCountRes] = await Promise.all([
    supabase.from("profiles").select("plan, premium_until").eq("id", userId).maybeSingle(),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", monthStart),
  ]);

  const premiumUntil = profileRes.data?.premium_until
    ? new Date(profileRes.data.premium_until as string)
    : null;
  const isPremium =
    (premiumUntil != null && premiumUntil.getTime() > now.getTime()) ||
    profileRes.data?.plan === "premium";

  if (isPremium) {
    return { ok: true, isPremium: true, monthlyUsed: txCountRes.count ?? 0, monthlyLimit: Infinity, message: null };
  }

  const monthlyUsed = txCountRes.count ?? 0;
  const limit = FREE_LIMITS.monthlyTransactions;
  if (monthlyUsed >= limit) {
    return {
      ok: false,
      isPremium: false,
      monthlyUsed,
      monthlyLimit: limit,
      message: `⛔ Aylık ${limit} işlem limitine ulaştınız! Premium'a geçin.`,
    };
  }

  return { ok: true, isPremium: false, monthlyUsed, monthlyLimit: limit, message: null };
}
