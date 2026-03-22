"use client";

import { Plus, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MiniCalendar } from "@/components/transactions/MiniCalendar";
import { PageShell } from "@/components/layout/PageShell";
import { EditTransactionModal } from "@/components/transactions/EditTransactionModal";
import { TransactionCard } from "@/components/transactions/TransactionCard";
import { TransactionModal } from "@/components/transactions/TransactionModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { errToast, txDeletedToast } from "@/lib/sd-toast";
import { groupTransactionsByLabel } from "@/lib/date-groups";
import { cn } from "@/lib/utils";
import type { TransactionCategory, TransactionRow } from "@/types/database";
import { useAuthStore } from "@/store/authStore";
import { useTransactionStore } from "@/store/transactionStore";

type Filter = "all" | TransactionCategory;

export function IslemlerView() {
  const initialized = useAuthStore((s) => s.initialized);
  const transactions = useTransactionStore((s) => s.transactions);
  const contacts = useTransactionStore((s) => s.contacts);
  const loading = useTransactionStore((s) => s.loading);
  const fetchAll = useTransactionStore((s) => s.fetchAll);
  const deleteTransaction = useTransactionStore((s) => s.deleteTransaction);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [filterDate, setFilterDate] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [editTx, setEditTx] = useState<TransactionRow | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());

  const calendarTransactions = useMemo(
    () =>
      transactions.map((t) => ({
        date: t.date,
        category: t.category,
        amount: Number(t.amount),
      })),
    [transactions]
  );

  const load = useCallback(() => {
    void fetchAll().then((r) => {
      if (r.error) errToast(r.error);
    });
  }, [fetchAll]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filter !== "all" && t.category !== filter) return false;
      if (filterDate && t.date !== filterDate) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      const name = (t.contacts?.name ?? "").toLowerCase();
      const desc = (t.description ?? "").toLowerCase();
      const tr = (t.transcript ?? "").toLowerCase();
      return name.includes(q) || desc.includes(q) || tr.includes(q);
    });
  }, [transactions, filter, filterDate, search]);

  const groups = useMemo(() => groupTransactionsByLabel(filtered), [filtered]);

  const onDelete = async (id: string) => {
    const { error } = await deleteTransaction(id);
    if (error) errToast(error);
    else txDeletedToast();
  };

  if (!initialized || (loading && transactions.length === 0)) {
    return (
      <PageShell
        title="İşlemler"
        variant="narrow"
        contentClassName="flex flex-col gap-4"
        titleClassName="hidden md:block"
      >
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="mt-3 h-10 w-full" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="mt-3 h-20 w-full rounded-2xl" />
        ))}
      </PageShell>
    );
  }

  const chips: { id: Filter; label: string }[] = [
    { id: "all", label: "Tümü" },
    { id: "gelir", label: "Gelir" },
    { id: "gider", label: "Gider" },
    { id: "alacak", label: "Alacak" },
    { id: "verecek", label: "Verecek" },
  ];

  return (
    <PageShell
      title="İşlemler"
      variant="narrow"
      contentClassName="flex flex-col gap-4"
      titleClassName="hidden md:block"
    >
      <MiniCalendar
        transactions={calendarTransactions}
        selectedDate={filterDate}
        onSelect={setFilterDate}
        currentMonth={currentMonth}
        onMonthChange={(deltaMonths) => {
          setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + deltaMonths, 1));
        }}
      />

      <div className="relative mb-3">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
        <input
          type="search"
          placeholder="Ara…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-h-[52px] w-full rounded-full border-[1.5px] py-3 pl-11 pr-4 text-sm font-medium shadow-[var(--shadow)] transition-all duration-200 focus:border-[var(--sd-primary)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--sd-primary)_25%,transparent)]"
          style={{
            borderColor: "var(--border-color)",
            background: "var(--bg-card)",
            color: "var(--text-primary)",
          }}
        />
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setFilter(c.id)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2.5 text-xs font-bold transition-all duration-200",
              filter === c.id
                ? "bg-[var(--sd-primary)] text-white shadow-md"
                : "shadow-[var(--shadow)] hover:opacity-90"
            )}
            style={
              filter === c.id
                ? undefined
                : {
                    background: "var(--bg-card)",
                    color: "var(--text-secondary)",
                  }
            }
          >
            {c.label}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-14 text-center transition-all duration-200 hover:-translate-y-px">
          <span className="text-5xl">📝</span>
          <p className="font-bold text-[var(--text-secondary)]">Henüz işlem yok</p>
          <p className="text-sm text-[var(--text-secondary)]">
            + ile ekleyin veya özet sayfasındaki ses satırından kayıt yapın.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map(({ label, items }) => (
            <section key={label}>
              <h2 className="sd-heading mb-2 text-sm font-bold text-[var(--text-secondary)]">{label}</h2>
              <div className="flex flex-col gap-2">
                {items.map((t) => (
                  <TransactionCard
                    key={t.id}
                    transaction={t}
                    onDelete={onDelete}
                    onEdit={setEditTx}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Button
        type="button"
        onClick={() => setModal(true)}
        className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-4 z-[60] !h-14 !w-14 !min-h-0 rounded-full !p-0 shadow-xl md:bottom-8 md:right-8"
        aria-label="Yeni işlem"
      >
        <Plus className="h-7 w-7" strokeWidth={2.5} />
      </Button>

      <TransactionModal open={modal} onClose={() => setModal(false)} contacts={contacts} />
      <EditTransactionModal
        open={editTx != null}
        transaction={editTx}
        onClose={() => setEditTx(null)}
        contacts={contacts}
      />
    </PageShell>
  );
}
