"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { cn, formatShortDate, formatTry } from "@/lib/utils";
import type { TransactionRow } from "@/types/database";

const REC_LABEL: Record<string, string> = {
  daily: "Her gün",
  weekly: "Her hafta",
  monthly: "Her ay",
  yearly: "Her yıl",
};

function dayOfMonth(d: string) {
  return new Date(d + "T12:00:00").getDate();
}

export function RecurringSection({ transactions }: { transactions: TransactionRow[] }) {
  const rows = useMemo(() => {
    return transactions
      .filter((t) => t.recurring && t.recurring !== "none")
      .slice(0, 8);
  }, [transactions]);

  if (rows.length === 0) return null;

  return (
    <section className="mt-6">
      <h2 className="sd-heading mb-2 text-lg text-[var(--text-primary)]">Tekrarlayan işlemler</h2>
      <Card className="divide-y p-0" style={{ borderColor: "var(--border-color)" }}>
        {rows.map((t) => {
          const lab = REC_LABEL[t.recurring as string] ?? t.recurring;
          const dom =
            t.recurring === "monthly" || t.recurring === "yearly"
              ? `${dayOfMonth(t.date)}. gün`
              : "";
          return (
            <div
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
            >
              <div className="min-w-0">
                <p className="font-bold text-[var(--text-primary)]">
                  {t.description?.trim() || t.category_tag || t.category}
                </p>
                <p className="text-xs font-semibold text-[var(--text-secondary)]">
                  {lab}
                  {dom ? ` · ${dom}` : ""}
                  {t.recurring_end ? ` · Bitiş ${formatShortDate(t.recurring_end)}` : ""}
                </p>
              </div>
              <p
                className={cn(
                  "sd-num font-extrabold",
                  t.category === "gelir" && "text-[var(--sd-gelir)]",
                  t.category === "gider" && "text-[var(--sd-gider)]",
                  t.category === "alacak" && "text-[var(--sd-alacak)]",
                  t.category === "verecek" && "text-[var(--sd-verecek)]"
                )}
              >
                {formatTry(Number(t.amount))}
              </p>
            </div>
          );
        })}
      </Card>
    </section>
  );
}
