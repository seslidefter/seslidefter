"use client";

import { AlertCircle, CalendarClock } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useLanguage } from "@/contexts/LanguageContext";
import { errToast } from "@/lib/sd-toast";
import { formatShortDate, formatTry, getCategoryLabel, todayISODate } from "@/lib/utils";
import type { TransactionRow } from "@/types/database";
import { useTransactionStore } from "@/store/transactionStore";

function daysUntil(due: string): number {
  const dueMs = new Date(`${due}T12:00:00`).getTime();
  const n = new Date(`${todayISODate()}T12:00:00`).getTime();
  return Math.ceil((dueMs - n) / (86400 * 1000));
}

function urgencyClass(d: number): string {
  if (d < 0) return "text-[var(--sd-gider)]";
  if (d < 3) return "text-[var(--sd-gider)] font-extrabold";
  if (d < 7) return "text-amber-600 font-bold";
  return "text-[var(--sd-primary)]";
}

export function UpcomingPayments() {
  const { t } = useLanguage();
  const transactions = useTransactionStore((s) => s.transactions);
  const markTransactionPaid = useTransactionStore((s) => s.markTransactionPaid);
  const [busy, setBusy] = useState<string | null>(null);

  const today = todayISODate();

  const rows = useMemo(() => {
    return transactions
      .filter(
        (row: TransactionRow) =>
          row.is_paid === false &&
          row.due_date != null &&
          row.due_date !== "" &&
          row.due_date >= today
      )
      .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))
      .slice(0, 5);
  }, [transactions, today]);

  const onPaid = async (id: string) => {
    setBusy(id);
    const { error } = await markTransactionPaid(id);
    setBusy(null);
    if (error) errToast(error);
  };

  if (rows.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="sd-heading text-lg">{t("dashboard.upcomingPayments")}</h2>
        <Link
          href="/islemler"
          className="text-sm font-bold text-[var(--sd-primary)] hover:underline"
        >
          {t("common.all")}
        </Link>
      </div>
      <div className="flex flex-col gap-2">
        {rows.map((tx) => {
          const d = daysUntil(tx.due_date!);
          const label =
            d < 0
              ? t("dashboard.daysLateShort", { days: Math.abs(d) })
              : d === 0
                ? t("dashboard.todayShort")
                : t("dashboard.daysLeftShort", { days: d });
          return (
            <Card
              key={tx.id}
              className="flex flex-col gap-2 p-4 transition-all duration-200 hover:-translate-y-0.5"
            >
              <div className="flex gap-3">
                <div
                  className={[
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                    tx.category === "verecek"
                      ? "bg-orange-100 text-orange-700"
                      : "bg-red-100 text-red-700",
                  ].join(" ")}
                >
                  {tx.category === "verecek" ? (
                    <CalendarClock className="h-6 w-6" />
                  ) : (
                    <AlertCircle className="h-6 w-6" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-[var(--sd-text)]">
                    {tx.description?.trim() || getCategoryLabel(tx.category)}
                  </p>
                  <p className="text-xs font-semibold text-black/45">
                    {tx.contacts?.name ?? "—"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="sd-num font-extrabold text-[var(--sd-text)]">
                    {formatTry(Number(tx.amount))}
                  </p>
                  <p className="text-[11px] font-semibold text-black/40">
                    {formatShortDate(tx.due_date!)}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className={["text-xs font-bold", urgencyClass(d)].join(" ")}>{label}</p>
                <Button
                  type="button"
                  className="!min-h-9 px-4 py-2 text-xs"
                  disabled={busy === tx.id}
                  onClick={() => void onPaid(tx.id)}
                >
                  {busy === tx.id ? "…" : t("debtCredit.paid")}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
