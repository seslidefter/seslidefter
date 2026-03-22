"use client";

import { Mic } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { UsageIndicator } from "@/components/plan/UsageIndicator";
import { DashboardVoiceCard } from "@/components/dashboard/DashboardVoiceCard";
import { RecurringSection } from "@/components/dashboard/RecurringSection";
import { UpcomingPayments } from "@/components/dashboard/UpcomingPayments";
import { PageShell } from "@/components/layout/PageShell";
import { EditTransactionModal } from "@/components/transactions/EditTransactionModal";
import { TransactionCard } from "@/components/transactions/TransactionCard";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { errToast, txDeletedToast } from "@/lib/sd-toast";
import { speak } from "@/lib/tts";
import { formatTry } from "@/lib/utils";
import type { TransactionRow } from "@/types/database";
import { useDashboardVoiceFabStore } from "@/store/dashboardVoiceFabStore";
import { useTransactionStore } from "@/store/transactionStore";

function VoiceQuerySync() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get("voice") !== "1") return;
    router.replace("/dashboard", { scroll: false });
    const t = window.setTimeout(() => {
      useDashboardVoiceFabStore.getState().requestFromFab();
    }, 100);
    return () => window.clearTimeout(t);
  }, [searchParams, router]);

  return null;
}

function DashboardInner() {
  const transactions = useTransactionStore((s) => s.transactions);
  const contacts = useTransactionStore((s) => s.contacts);
  const loading = useTransactionStore((s) => s.loading);
  const fetchAll = useTransactionStore((s) => s.fetchAll);
  const deleteTransaction = useTransactionStore((s) => s.deleteTransaction);
  const [editTx, setEditTx] = useState<TransactionRow | null>(null);

  const loadTx = useCallback(() => {
    void fetchAll().then((r) => {
      if (r.error) errToast(r.error);
    });
  }, [fetchAll]);

  useEffect(() => {
    loadTx();
  }, [loadTx]);

  const sums = useMemo(() => {
    let gelir = 0,
      gider = 0,
      alacak = 0,
      verecek = 0;
    for (const t of transactions) {
      const a = Number(t.amount);
      if (t.category === "gelir") gelir += a;
      else if (t.category === "gider") gider += a;
      else if (t.category === "alacak") alacak += a;
      else if (t.category === "verecek") verecek += a;
    }
    const head = transactions[0];
    const kasaBakiye =
      head?.balance_after != null && !Number.isNaN(Number(head.balance_after))
        ? Number(head.balance_after)
        : gelir - gider;
    return { gelir, gider, alacak, verecek, kasaBakiye };
  }, [transactions]);

  const recent = useMemo(() => transactions.slice(0, 5), [transactions]);

  const onDelete = async (id: string) => {
    const { error } = await deleteTransaction(id);
    if (error) errToast(error);
    else txDeletedToast();
  };

  if (loading && transactions.length === 0) {
    return (
      <PageShell variant="wide" contentClassName="flex flex-col gap-4 pb-28">
        <Skeleton className="h-44 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell variant="wide" contentClassName="relative flex flex-col gap-4 pb-28">
      <VoiceQuerySync />

      <Card className="sd-gradient relative min-h-[160px] overflow-hidden border-0 p-7 text-white shadow-lg transition-all duration-200 hover:-translate-y-px">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-bold text-white/90">Kasa Bakiyesi</p>
          <button
            type="button"
            onClick={() =>
              speak(`Kasa bakiyeniz ${sums.kasaBakiye.toFixed(2).replace(".", ",")} lira`)
            }
            className="speak-balance-btn rounded-full px-2 py-1 text-lg text-white/90 hover:bg-white/15"
            title="Sesli oku"
          >
            🔊
          </button>
        </div>
        <p className="sd-num sd-heading mt-3 text-4xl font-extrabold tracking-tight md:text-5xl">
          {formatTry(sums.kasaBakiye)}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Badge className="border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-extrabold text-white backdrop-blur-sm">
            ↑ Alacak {formatTry(sums.alacak)}
          </Badge>
          <Badge className="border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-extrabold text-white backdrop-blur-sm">
            ↓ Verecek {formatTry(sums.verecek)}
          </Badge>
        </div>
      </Card>

      <UsageIndicator />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="border-l-4 border-l-[var(--sd-gelir)] p-4 transition-all duration-200 hover:-translate-y-px">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">Gelir</p>
          <p className="sd-num sd-heading mt-1 text-lg font-bold text-[var(--sd-gelir)]">
            {formatTry(sums.gelir)}
          </p>
        </Card>
        <Card className="border-l-4 border-l-[var(--sd-gider)] p-4 transition-all duration-200 hover:-translate-y-px">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">Gider</p>
          <p className="sd-num sd-heading mt-1 text-lg font-bold text-[var(--sd-gider)]">
            {formatTry(sums.gider)}
          </p>
        </Card>
        <Card className="border-l-4 border-l-[var(--sd-alacak)] p-4 transition-all duration-200 hover:-translate-y-px">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">Alacak</p>
          <p className="sd-num sd-heading mt-1 text-lg font-bold text-[var(--sd-alacak)]">
            {formatTry(sums.alacak)}
          </p>
        </Card>
        <Card className="border-l-4 border-l-[var(--sd-verecek)] p-4 transition-all duration-200 hover:-translate-y-px">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">Verecek</p>
          <p className="sd-num sd-heading mt-1 text-lg font-bold text-[var(--sd-verecek)]">
            {formatTry(sums.verecek)}
          </p>
        </Card>
      </div>

      <RecurringSection transactions={transactions} />

      <div className="mt-2">
        <DashboardVoiceCard />
      </div>

      <UpcomingPayments />

      <section className="mt-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="sd-heading text-lg text-[var(--text-primary)]">Son işlemler</h2>
          <Link
            href="/islemler"
            className="text-sm font-bold text-[var(--sd-primary)] hover:underline"
          >
            Tümü
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          {recent.length === 0 ? (
            <Card className="flex flex-col items-center gap-2 py-10 text-center">
              <span className="text-4xl">📭</span>
              <p className="font-semibold text-[var(--text-secondary)]">Henüz işlem yok</p>
              <p className="text-sm text-[var(--text-secondary)]">
                Alttaki ses satırı veya işlemler sayfasından ekleyin.
              </p>
            </Card>
          ) : (
            recent.map((t: TransactionRow) => (
              <TransactionCard key={t.id} transaction={t} onDelete={onDelete} onEdit={setEditTx} />
            ))
          )}
        </div>
      </section>

      <button
        type="button"
        onClick={() => useDashboardVoiceFabStore.getState().requestFromFab()}
        className="sd-fab-pulse sd-gradient fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-4 z-[72] hidden h-14 w-14 items-center justify-center rounded-full text-white shadow-xl md:bottom-8 md:right-8 md:flex"
        aria-label="Sesle kayıt — karta git"
      >
        <Mic className="h-7 w-7" strokeWidth={2.4} />
      </button>

      <EditTransactionModal
        open={editTx != null}
        transaction={editTx}
        onClose={() => setEditTx(null)}
        contacts={contacts}
      />
    </PageShell>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <PageShell variant="wide" contentClassName="flex flex-col gap-4 pb-28">
          <Skeleton className="h-36 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
        </PageShell>
      }
    >
      <DashboardInner />
    </Suspense>
  );
}
