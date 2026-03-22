"use client";

import { useRouter } from "next/navigation";
import { usePlanLimits } from "@/hooks/usePlanLimits";

export function UsageIndicator() {
  const { planData, loading } = usePlanLimits();
  const router = useRouter();

  if (loading || !planData) return null;
  if (planData.isPremium) {
    return (
      <div className="premium-badge-bar">
        <span>⭐ Premium</span>
        {planData.daysRemaining !== null ? (
          <span className="premium-days">{planData.daysRemaining} gün kaldı</span>
        ) : null}
        <span className="premium-unlimited">Sınırsız işlem</span>
      </div>
    );
  }

  const { monthlyUsed, monthlyLimit, usagePercent, isLimitReached } = planData;
  const barColor = usagePercent >= 90 ? "#d32f2f" : usagePercent >= 70 ? "#f57c00" : "#2e7d32";

  return (
    <div className={`usage-indicator ${isLimitReached ? "limit-reached" : ""}`}>
      <div className="usage-header">
        <div className="usage-left">
          <span className="usage-plan-badge free">🆓 Ücretsiz Plan</span>
          <span className="usage-title">Aylık İşlem Kullanımı</span>
        </div>
        <button
          type="button"
          onClick={() => router.push("/profil#plan")}
          className="usage-upgrade-btn"
        >
          ⭐ Yükselt
        </button>
      </div>

      <div className="usage-bar-wrap">
        <div className="usage-bar">
          <div
            className="usage-bar-fill"
            style={{ width: `${usagePercent}%`, background: barColor }}
          />
        </div>
        <span className="usage-count" style={{ color: barColor }}>
          {monthlyUsed}/{monthlyLimit}
        </span>
      </div>

      {isLimitReached ? (
        <div className="usage-limit-msg">
          ⛔ Bu ay işlem limitine ulaştınız. Premium&apos;a geçerek sınırsız işlem ekleyin.
          <button
            type="button"
            onClick={() => router.push("/profil#plan")}
            className="btn-premium-small"
          >
            Premium&apos;a Geç →
          </button>
        </div>
      ) : usagePercent >= 80 ? (
        <div className="usage-warning-msg">
          ⚠️ Limitin %{Math.round(usagePercent)}&apos;ini kullandınız.{" "}
          {monthlyLimit - monthlyUsed} işlem kaldı.
        </div>
      ) : null}
    </div>
  );
}
