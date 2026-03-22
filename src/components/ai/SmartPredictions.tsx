"use client";

import { useMemo } from "react";
import type { TransactionRow } from "@/types/database";

interface Pred {
  icon: string;
  text: string;
  type: "warning" | "success" | "info";
}

export function SmartPredictions({ transactions }: { transactions: TransactionRow[] }) {
  const predictions = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

    const inMonth = (t: TransactionRow, m: number, y: number) => {
      const d = new Date(`${t.date}T12:00:00`);
      return d.getMonth() === m && d.getFullYear() === y;
    };

    const thisMonthTxs = transactions.filter((t) => inMonth(t, thisMonth, thisYear));
    const lastMonthTxs = transactions.filter((t) => inMonth(t, lastMonth, lastMonthYear));

    const sumCat = (txs: TransactionRow[], cat: string) =>
      txs.filter((t) => t.category === cat).reduce((s, t) => s + Number(t.amount), 0);

    const thisGider = sumCat(thisMonthTxs, "gider");
    const lastGider = sumCat(lastMonthTxs, "gider");
    const thisGelir = sumCat(thisMonthTxs, "gelir");

    const results: Pred[] = [];

    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(thisYear, thisMonth + 1, 0).getDate();
    const projectedGider = dayOfMonth > 0 ? (thisGider / dayOfMonth) * daysInMonth : 0;
    results.push({
      icon: "📊",
      text: `Bu ay tahmini toplam gider: ₺${projectedGider.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}`,
      type: lastGider > 0 && projectedGider > lastGider * 1.2 ? "warning" : "info",
    });

    if (lastGider > 0) {
      const diff = ((thisGider - lastGider) / lastGider) * 100;
      const isMore = thisGider > lastGider;
      results.push({
        icon: isMore ? "⚠️" : "✅",
        text: `Geçen aya göre harcama ${isMore ? `%${diff.toFixed(0)} fazla` : `%${Math.abs(diff).toFixed(0)} az`}`,
        type: isMore ? "warning" : "success",
      });
    }

    if (thisGelir > 0) {
      const savingRate = ((thisGelir - thisGider) / thisGelir) * 100;
      results.push({
        icon: savingRate > 20 ? "🎯" : "💡",
        text: `Tasarruf oranın: %${savingRate.toFixed(0)}${savingRate < 20 ? " (hedef %20)" : " — harika!"}`,
        type: savingRate > 20 ? "success" : "info",
      });
    }

    const catTotals: Record<string, number> = {};
    for (const t of thisMonthTxs) {
      if (t.category !== "gider") continue;
      const tag = t.category_tag?.trim() || "Diğer";
      catTotals[tag] = (catTotals[tag] || 0) + Number(t.amount);
    }
    const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
    if (topCat) {
      results.push({
        icon: "🏷️",
        text: `En çok harcama: ${topCat[0]} (₺${topCat[1].toLocaleString("tr-TR", { maximumFractionDigits: 0 })})`,
        type: "info",
      });
    }

    return results;
  }, [transactions]);

  if (predictions.length === 0) return null;

  return (
    <div className="predictions-card">
      <h3 className="predictions-title">🧠 Akıllı tahminler</h3>
      <div className="predictions-list">
        {predictions.map((p, i) => (
          <div key={i} className={`prediction-item ${p.type}`}>
            <span className="prediction-icon">{p.icon}</span>
            <span className="prediction-text">{p.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
