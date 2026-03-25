"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { PageShell } from "@/components/layout/PageShell";
import { EditTransactionModal } from "@/components/transactions/EditTransactionModal";
import { MiniCalendar } from "@/components/transactions/MiniCalendar";
import { TransactionModal } from "@/components/transactions/TransactionModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { errToast } from "@/lib/sd-toast";
import type { TransactionCategory, TransactionRow } from "@/types/database";
import { useAuthStore } from "@/store/authStore";
import { useTransactionStore } from "@/store/transactionStore";

type FilterKey = "all" | TransactionCategory;

const categoryConfig: Record<
  string,
  { label: string; color: string; bg: string; sign: string }
> = {
  gelir: { label: "Gelir", color: "#2E7D32", bg: "#E8F5E9", sign: "+" },
  gider: { label: "Gider", color: "#D32F2F", bg: "#FFEBEE", sign: "-" },
  alacak: { label: "Alacak", color: "#1565C0", bg: "#E3F2FD", sign: "+" },
  verecek: { label: "Borç", color: "#E65100", bg: "#FFF3E0", sign: "-" },
};

export function IslemlerView() {
  const { t, language } = useLanguage();
  const dateLocale = language === "en" ? "en-US" : "tr-TR";
  const initialized = useAuthStore((s) => s.initialized);
  const transactions = useTransactionStore((s) => s.transactions);
  const contacts = useTransactionStore((s) => s.contacts);
  const loading = useTransactionStore((s) => s.loading);
  const fetchAll = useTransactionStore((s) => s.fetchAll);
  const deleteTransaction = useTransactionStore((s) => s.deleteTransaction);

  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date | null>(null);
  const [calendarBounds, setCalendarBounds] = useState<{ today: string; yesterday: string } | null>(
    null
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTx, setEditTx] = useState<TransactionRow | null>(null);

  useEffect(() => {
    const now = new Date();
    setCurrentMonth(now);
    const today = now.toISOString().split("T")[0]!;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0]!;
    setCalendarBounds({ today, yesterday });
  }, []);

  const loadData = useCallback(() => {
    void fetchAll().then((r) => {
      if (r.error) errToast(r.error);
    });
  }, [fetchAll]);

  const filterChips = useMemo(
    () =>
      [
        { key: "all" as const, label: t("common.all"), activeClass: "bg-gray-800 text-white dark:bg-white dark:text-gray-800" },
        { key: "gelir" as const, label: t("transactions.income"), activeClass: "bg-green-600 text-white" },
        { key: "gider" as const, label: t("transactions.expense"), activeClass: "bg-red-500 text-white" },
        { key: "alacak" as const, label: t("transactions.credit"), activeClass: "bg-blue-600 text-white" },
        { key: "verecek" as const, label: t("transactions.debt"), activeClass: "bg-orange-500 text-white" },
      ] as const,
    [t]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const calendarTx = useMemo(
    () =>
      transactions.map((tx) => ({
        date: tx.date,
        category: tx.category,
        amount: Number(tx.amount),
      })),
    [transactions]
  );

  const handleDelete = async (id: string) => {
    if (!confirm("Bu işlemi silmek istediğinizden emin misiniz?")) return;
    const { error } = await deleteTransaction(id);
    if (error) {
      toast.error("Silinemedi: " + error);
      return;
    }
    toast.success("🗑️ Silindi");
  };

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (filter !== "all" && tx.category !== filter) return false;
      if (selectedDate && tx.date !== selectedDate) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const contact = contacts.find((c) => c.id === tx.contact_id);
        return (
          (tx.description?.toLowerCase().includes(q) ?? false) ||
          (contact?.name?.toLowerCase().includes(q) ?? false) ||
          (tx.category_tag?.toLowerCase().includes(q) ?? false) ||
          (tx.transcript?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }, [transactions, filter, selectedDate, search, contacts]);

  const grouped = useMemo(() => {
    const groups: Record<string, TransactionRow[]> = {};
    for (const tx of filtered) {
      const key = tx.date;
      if (!groups[key]) groups[key] = [];
      groups[key].push(tx);
    }
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const getDateLabel = useCallback(
    (dateStr: string): string => {
      if (calendarBounds) {
        if (dateStr === calendarBounds.today) return t("dashboard.todayShort");
        if (dateStr === calendarBounds.yesterday) return t("dashboard.yesterdayShort");
      }
      return new Date(dateStr + "T12:00:00").toLocaleDateString(dateLocale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    },
    [calendarBounds, dateLocale, t]
  );

  const showSkeleton = !initialized || (loading && transactions.length === 0);

  if (!currentMonth) {
    return (
      <PageShell
        title={t("transactions.title")}
        variant="narrow"
        contentClassName="pb-32"
        titleClassName="hidden md:block"
      >
        <div className="mx-auto w-full max-w-4xl space-y-2 px-4 py-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800"
            />
          ))}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={t("transactions.title")}
      variant="narrow"
      contentClassName="pb-32"
      titleClassName="hidden md:block"
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col px-0 py-1">
        <MiniCalendar
          transactions={calendarTx}
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
          currentMonth={currentMonth}
          onMonthChange={(deltaMonths) => {
            setCurrentMonth((prev) => {
              if (!prev) return new Date();
              return new Date(prev.getFullYear(), prev.getMonth() + deltaMonths, 1);
            });
          }}
        />

        <div className="relative mb-3 mt-3">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="İşlem veya kişi ara..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-8 text-sm text-gray-900 focus:border-green-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400"
              aria-label="Temizle"
            >
              ✕
            </button>
          ) : null}
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filterChips.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`flex-shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                filter === f.key
                  ? f.activeClass
                  : "border border-gray-200 bg-white text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              {f.label}
            </button>
          ))}
          {selectedDate ? (
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              suppressHydrationWarning
              className="flex-shrink-0 rounded-full border border-green-200 bg-green-100 px-3 py-2 text-xs font-bold text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300"
            >
              📅{" "}
              <span suppressHydrationWarning>
                {new Date(selectedDate + "T12:00:00").toLocaleDateString(dateLocale, {
                  day: "numeric",
                  month: "short",
                })}
              </span>{" "}
              ✕
            </button>
          ) : null}
        </div>

        {filtered.length > 0 ? (
          <div className="mb-4 flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="min-w-[80px] flex-shrink-0 rounded-xl border border-gray-100 bg-white px-3 py-2 text-center dark:border-gray-700 dark:bg-gray-800">
              <div className="text-xs text-gray-400">{t("transactions.income")}</div>
              <div className="text-sm font-bold text-green-600">
                ₺
                {filtered
                  .filter((x) => x.category === "gelir")
                  .reduce((s, x) => s + Number(x.amount), 0)
                  .toLocaleString("tr-TR")}
              </div>
            </div>
            <div className="min-w-[80px] flex-shrink-0 rounded-xl border border-gray-100 bg-white px-3 py-2 text-center dark:border-gray-700 dark:bg-gray-800">
              <div className="text-xs text-gray-400">{t("transactions.expense")}</div>
              <div className="text-sm font-bold text-red-500">
                ₺
                {filtered
                  .filter((x) => x.category === "gider")
                  .reduce((s, x) => s + Number(x.amount), 0)
                  .toLocaleString("tr-TR")}
              </div>
            </div>
            <div className="min-w-[80px] flex-shrink-0 rounded-xl border border-gray-100 bg-white px-3 py-2 text-center dark:border-gray-700 dark:bg-gray-800">
              <div className="text-xs text-gray-400">{t("transactions.txnCount", { count: filtered.length })}</div>
              <div className="text-sm font-bold text-gray-700 dark:text-gray-300">{t("transactions.summary")}</div>
            </div>
          </div>
        ) : null}

        {showSkeleton ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mb-3 text-5xl">📝</div>
            <p className="font-medium text-gray-500 dark:text-gray-400">{t("transactions.noTransactions")}</p>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="mt-4 rounded-xl bg-green-700 px-6 py-3 text-sm font-bold text-white hover:bg-green-600"
            >
              + {t("transactions.addNew")}
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {grouped.map(([date, txs]) => {
              const dayIncome = txs.filter((x) => x.category === "gelir").reduce((s, x) => s + Number(x.amount), 0);
              const dayExpense = txs.filter((x) => x.category === "gider").reduce((s, x) => s + Number(x.amount), 0);

              return (
                <div key={date}>
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      suppressHydrationWarning
                      className="text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-400"
                    >
                      {getDateLabel(date)}
                    </span>
                    <div className="h-px flex-1 bg-gray-100 dark:bg-gray-700" />
                    <div className="flex gap-2 text-xs">
                      {dayIncome > 0 ? (
                        <span className="font-bold text-green-600">+₺{dayIncome.toLocaleString("tr-TR")}</span>
                      ) : null}
                      {dayExpense > 0 ? (
                        <span className="font-bold text-red-500">-₺{dayExpense.toLocaleString("tr-TR")}</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    {txs.map((tx, idx) => {
                      const cfg = categoryConfig[tx.category] ?? categoryConfig.gider;
                      const contact = contacts.find((c) => c.id === tx.contact_id);
                      const time = new Date(tx.created_at).toLocaleTimeString(dateLocale, {
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      const isLast = idx === txs.length - 1;

                      return (
                        <div
                          key={tx.id}
                          className={cn(
                            "group flex items-center gap-3 px-4 py-3.5 transition-all hover:bg-gray-50 dark:hover:bg-gray-700/40",
                            !isLast && "border-b border-gray-100 dark:border-gray-700"
                          )}
                        >
                          <div
                            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold"
                            style={{ background: cfg.bg, color: cfg.color }}
                          >
                            {cfg.sign === "+" ? "↑" : "↓"}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                              {tx.description || contact?.name || cfg.label}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                              {contact ? (
                                <span className="max-w-[80px] truncate text-xs text-gray-400">{contact.name}</span>
                              ) : null}
                              {tx.category_tag ? (
                                <span
                                  className="rounded-full px-1.5 py-0.5 text-xs"
                                  style={{ background: cfg.bg, color: cfg.color }}
                                >
                                  {tx.category_tag}
                                </span>
                              ) : null}
                              <span suppressHydrationWarning className="text-xs text-gray-400">
                                {time}
                              </span>
                            </div>
                          </div>

                          <div className="mr-2 flex-shrink-0 text-right">
                            <div className="text-sm font-bold" style={{ color: cfg.color }}>
                              {cfg.sign}₺{Number(tx.amount).toLocaleString("tr-TR")}
                            </div>
                            {tx.balance_after != null ? (
                              <div className="mt-0.5 text-xs text-gray-400">
                                ₺{Number(tx.balance_after).toLocaleString("tr-TR")}
                              </div>
                            ) : null}
                          </div>

                          <div className="flex flex-shrink-0 gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => setEditTx(tx)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-xs text-blue-500 hover:bg-blue-100 dark:bg-blue-900/30"
                              aria-label={t("common.edit")}
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDelete(tx.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-xs text-red-500 hover:bg-red-100 dark:bg-red-900/30"
                              aria-label={t("common.delete")}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-green-700 text-3xl text-white shadow-lg shadow-green-500/30 transition-all hover:bg-green-600 active:scale-95 md:bottom-8 md:right-8"
          aria-label={t("transactions.addNew")}
        >
          +
        </button>
      </div>

      <TransactionModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        contacts={contacts}
      />
      <EditTransactionModal
        open={editTx != null}
        transaction={editTx}
        onClose={() => setEditTx(null)}
        contacts={contacts}
      />
    </PageShell>
  );
}
