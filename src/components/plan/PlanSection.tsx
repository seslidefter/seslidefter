"use client";

import toast from "react-hot-toast";
import type { PlanLimits } from "@/hooks/usePlanLimits";
import { FREE_LIMITS } from "@/lib/plan-limits";

const FEATURES_FREE: { icon: string; text: string; available: boolean }[] = [
  { icon: "✅", text: "Aylık 50 işlem kaydı", available: true },
  { icon: "✅", text: "10 kişi / alacak takibi", available: true },
  { icon: "✅", text: "3 ödeme planı", available: true },
  { icon: "✅", text: "Temel raporlar", available: true },
  { icon: "✅", text: "Sesli kayıt", available: true },
  { icon: "✅", text: "Davet kodu ile kazanım", available: true },
  { icon: "❌", text: "Sınırsız işlem", available: false },
  { icon: "❌", text: "AI finansal asistan", available: false },
  { icon: "❌", text: "Excel / PDF dışa aktarma", available: false },
  { icon: "❌", text: "Fiş / fatura tarama (OCR)", available: false },
  { icon: "❌", text: "WhatsApp borç hatırlatma", available: false },
  { icon: "❌", text: "Tekrarlayan işlemler", available: false },
  { icon: "❌", text: "Akıllı tahminler", available: false },
];

const FEATURES_PREMIUM: { icon: string; text: string; highlight?: boolean }[] = [
  { icon: "⭐", text: "Sınırsız işlem kaydı", highlight: true },
  { icon: "⭐", text: "Sınırsız kişi takibi", highlight: true },
  { icon: "⭐", text: "Sınırsız ödeme planı", highlight: true },
  { icon: "🤖", text: "AI finansal asistan (Türkçe)", highlight: true },
  { icon: "🧠", text: "Akıllı harcama tahminleri", highlight: true },
  { icon: "📊", text: "Gelişmiş raporlar ve grafikler" },
  { icon: "📥", text: "Excel dışa aktarma" },
  { icon: "📷", text: "Fiş ve fatura tarama (OCR)" },
  { icon: "📱", text: "WhatsApp borç hatırlatma" },
  { icon: "🔄", text: "Tekrarlayan işlemler" },
  { icon: "🎙️", text: "Sınırsız sesli kayıt" },
  { icon: "🔊", text: "Sesli okuma (TTS)" },
  { icon: "📅", text: "Yaklaşan ödeme takibi" },
  { icon: "🌙", text: "Karanlık mod" },
];

export function PlanSection({ planData }: { planData: PlanLimits | null }) {
  if (!planData) {
    return (
      <div className="plan-section">
        <div className="skeleton-card h-40 rounded-2xl" />
      </div>
    );
  }

  if (planData.isPremium) {
    const untilLabel =
      planData.premiumUntil != null
        ? planData.premiumUntil.toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : "—";

    return (
      <div className="plan-section" id="plan">
        <div className="premium-active-card">
          <div className="premium-active-header">
            <span className="premium-star" aria-hidden>
              ⭐
            </span>
            <div>
              <div className="premium-active-title">Premium Üye</div>
              <div className="premium-active-sub">
                {planData.daysRemaining !== null
                  ? `${planData.daysRemaining} gün kaldı — ${untilLabel}`
                  : "Premium aktif"}
              </div>
            </div>
          </div>
          <div className="premium-features-grid">
            {FEATURES_PREMIUM.map((f, i) => (
              <div key={i} className={`premium-feature-item ${f.highlight ? "highlight" : ""}`}>
                <span>{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const mu = planData.monthlyUsed;
  const ml = FREE_LIMITS.monthlyTransactions;
  const cu = planData.contactsUsed;
  const pu = planData.paymentPlansUsed;

  return (
    <div className="plan-section" id="plan">
      <div className="current-plan-card">
        <div className="current-plan-header">
          <span>🆓 Ücretsiz Plan</span>
          <span className="join-date">
            Üyelik:{" "}
            {planData.joinDate.toLocaleDateString("tr-TR", { month: "long", year: "numeric" })}
          </span>
        </div>

        <div className="usage-metrics">
          <div className="usage-metric">
            <div className="metric-header">
              <span>📝 Aylık İşlem</span>
              <span className="metric-value">
                {mu} / {ml}
              </span>
            </div>
            <div className="metric-bar">
              <div style={{ width: `${Math.min((mu / ml) * 100, 100)}%` }} />
            </div>
          </div>
          <div className="usage-metric">
            <div className="metric-header">
              <span>👥 Kişi Sayısı</span>
              <span className="metric-value">
                {cu} / 10
              </span>
            </div>
            <div className="metric-bar">
              <div style={{ width: `${Math.min((cu / 10) * 100, 100)}%` }} />
            </div>
          </div>
          <div className="usage-metric">
            <div className="metric-header">
              <span>💳 Ödeme Planı</span>
              <span className="metric-value">
                {pu} / 3
              </span>
            </div>
            <div className="metric-bar">
              <div style={{ width: `${Math.min((pu / 3) * 100, 100)}%` }} />
            </div>
          </div>
        </div>

        <div className="free-features">
          {FEATURES_FREE.map((f, i) => (
            <div key={i} className={`feature-row ${!f.available ? "locked" : ""}`}>
              <span className="feature-icon">{f.icon}</span>
              <span className="feature-text">{f.text}</span>
              {!f.available ? <span className="lock-icon">🔒</span> : null}
            </div>
          ))}
        </div>
      </div>

      <div className="premium-upgrade-card">
        <div className="premium-upgrade-header">
          <div>
            <div className="premium-upgrade-title">⭐ Premium&apos;a Geç</div>
            <div className="premium-upgrade-sub">Tüm özelliklerin kilidini aç</div>
          </div>
          <div className="premium-pricing">
            <div className="price-monthly">
              <span className="price-amount">₺99</span>
              <span className="price-period">/ay</span>
            </div>
            <div className="price-yearly">
              <span className="price-badge">%33 indirim</span>
              <span>₺799/yıl</span>
            </div>
          </div>
        </div>

        <div className="premium-features-grid">
          {FEATURES_PREMIUM.map((f, i) => (
            <div key={i} className={`premium-feature-item ${f.highlight ? "highlight" : ""}`}>
              <span>{f.icon}</span>
              <span>{f.text}</span>
            </div>
          ))}
        </div>

        <div className="premium-cta">
          <button
            type="button"
            className="btn-premium-monthly"
            onClick={() => toast("Ödeme yakında — seslidefter@gmail.com")}
          >
            ₺99/ay ile Başla
          </button>
          <button
            type="button"
            className="btn-premium-yearly"
            onClick={() => toast("Ödeme yakında — seslidefter@gmail.com")}
          >
            ₺799/yıl — En İyi Değer 🏆
          </button>
        </div>

        <div className="premium-guarantee">🔒 Güvenli ödeme • İstediğin zaman iptal et</div>

        <div className="premium-referral">
          💡 <strong>Ücretsiz dene:</strong> Davet kodunu paylaş, her davet için 30 gün premium kazan!{" "}
          <a href="#invite" className="referral-link">
            Davet kodunu gör →
          </a>
        </div>
      </div>
    </div>
  );
}
