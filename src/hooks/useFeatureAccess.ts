"use client";

import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { usePlanLimits } from "@/hooks/usePlanLimits";

const PREMIUM_FEATURES = {
  aiAssistant: true,
  ocr: true,
  whatsapp: true,
  export: true,
  recurring: true,
  unlimitedTransactions: true,
  unlimitedContacts: true,
  unlimitedPaymentPlans: true,
} as const;

export type PremiumFeatureKey = keyof typeof PREMIUM_FEATURES;

export function useFeatureAccess() {
  const { planData, loading } = usePlanLimits();
  const router = useRouter();

  function checkAccess(feature: PremiumFeatureKey): boolean {
    if (loading) return true;
    if (!planData) return false;
    if (planData.isPremium) return true;

    const premiumOnly = PREMIUM_FEATURES[feature];
    if (!premiumOnly) return true;

    toast.error("⭐ Bu özellik Premium plana özel!", {
      duration: 3000,
      icon: "🔒",
    });
    setTimeout(() => router.push("/profil#plan"), 1500);
    return false;
  }

  function checkTransactionLimit(): boolean {
    if (loading) return true;
    if (!planData) return false;
    if (planData.isPremium) return true;
    if (planData.isLimitReached) {
      toast.error(`⛔ Aylık ${planData.monthlyLimit} işlem limitine ulaştınız!`, {
        duration: 4000,
      });
      setTimeout(() => router.push("/profil#plan"), 2000);
      return false;
    }
    return true;
  }

  return { checkAccess, checkTransactionLimit, planData, loading };
}
