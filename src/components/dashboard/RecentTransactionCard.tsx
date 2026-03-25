"use client";

import { getCategoryLabel } from "@/lib/utils";
import type { ContactRow, TransactionRow } from "@/types/database";

const categoryConfig: Record<
  string,
  { label: string; color: string; bg: string; icon: string }
> = {
  gelir: { label: "Gelir", color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30", icon: "↑" },
  gider: { label: "Gider", color: "text-red-500 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30", icon: "↓" },
  alacak: { label: "Alacak", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30", icon: "←" },
  verecek: { label: "Borç", color: "text-orange-500 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/30", icon: "→" },
};

export function RecentTransactionCard({
  tx,
  contacts,
}: {
  tx: TransactionRow;
  contacts: ContactRow[];
}) {
  const contact = contacts.find((c) => c.id === tx.contact_id);
  const isPositive = tx.category === "gelir" || tx.category === "alacak";
  const cfg = categoryConfig[tx.category] ?? categoryConfig.gider;
  const time = new Date(tx.created_at).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const date = new Date(tx.date + "T12:00:00").toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
  });

  return (
    <div className="flex items-center gap-3 border-b border-black/[0.06] py-3 last:border-0 dark:border-white/10">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold ${cfg.bg} ${cfg.color}`}
      >
        {cfg.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-[var(--text-primary)]">
          {tx.description?.trim() || contact?.name || getCategoryLabel(tx.category)}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.color}`}>
            {cfg.label}
          </span>
          <span suppressHydrationWarning className="text-xs text-[var(--text-secondary)]">
            {date} · {time}
          </span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className={`sd-num text-sm font-bold ${cfg.color}`}>
          {isPositive ? "+" : "−"}₺{Number(tx.amount).toLocaleString("tr-TR")}
        </div>
        {tx.balance_after != null && !Number.isNaN(Number(tx.balance_after)) ? (
          <div className="mt-0.5 text-xs text-[var(--text-secondary)]">
            Kasa: ₺{Number(tx.balance_after).toLocaleString("tr-TR")}
          </div>
        ) : null}
      </div>
    </div>
  );
}
