"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SmartPredictions } from "@/components/ai/SmartPredictions";
import { CategoryChart, type CategorySlice } from "@/components/rapor/CategoryChart";
import { TrendChart, type TrendMonthRow } from "@/components/rapor/TrendChart";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { errToast } from "@/lib/sd-toast";
import { tagColorFor } from "@/lib/tag-display";
import { formatTry } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useTransactionStore } from "@/store/transactionStore";
import { AlacakVerecekBar, GelirGiderArea, type AvPoint, type TrendPoint } from "./charts";

type Period = "week" | "month" | "3m" | "6m" | "year";

function rangeFor(period: Period): { start: Date; end: Date } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (period === "week") {
    start.setDate(start.getDate() - 6);
    return { start, end };
  }
  if (period === "month") {
    start.setDate(1);
    return { start, end };
  }
  if (period === "3m") {
    start.setMonth(start.getMonth() - 3);
    return { start, end };
  }
  if (period === "6m") {
    start.setMonth(start.getMonth() - 6);
    return { start, end };
  }
  start.setMonth(0, 1);
  return { start, end };
}

function inRange(iso: string, start: Date, end: Date) {
  const t = new Date(iso + "T12:00:00").getTime();
  return t >= start.getTime() && t <= end.getTime();
}

const PERIOD_BTN: { id: Period; label: string }[] = [
  { id: "week", label: "Bu Hafta" },
  { id: "month", label: "Bu Ay" },
  { id: "3m", label: "3 Ay" },
  { id: "6m", label: "6 Ay" },
  { id: "year", label: "Bu Yıl" },
];

function monthKey(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function RaporPageClient() {
  const initialized = useAuthStore((s) => s.initialized);
  const transactions = useTransactionStore((s) => s.transactions);
  const loading = useTransactionStore((s) => s.loading);
  const fetchAll = useTransactionStore((s) => s.fetchAll);
  const [period, setPeriod] = useState<Period>("month");

  const load = useCallback(() => {
    void fetchAll().then((r) => {
      if (r.error) errToast(r.error);
    });
  }, [fetchAll]);

  useEffect(() => {
    load();
  }, [load]);

  const { start, end } = useMemo(() => rangeFor(period), [period]);

  const filtered = useMemo(
    () => transactions.filter((t) => inRange(t.date, start, end)),
    [transactions, start, end]
  );

  const summary = useMemo(() => {
    let gelir = 0,
      gider = 0,
      alacak = 0,
      verecek = 0;
    for (const t of filtered) {
      const a = Number(t.amount);
      if (t.category === "gelir") gelir += a;
      if (t.category === "gider") gider += a;
      if (t.category === "alacak") alacak += a;
      if (t.category === "verecek") verecek += a;
    }
    const net = gelir - gider;
    const tasarruf = gelir > 0 ? Math.round(((gelir - gider) / gelir) * 100) : 0;
    return { gelir, gider, alacak, verecek, net, tasarruf };
  }, [filtered]);

  const areaData: TrendPoint[] = useMemo(() => {
    const map = new Map<string, { gelir: number; gider: number }>();
    for (const t of filtered) {
      if (t.category !== "gelir" && t.category !== "gider") continue;
      const k = t.date;
      if (!map.has(k)) map.set(k, { gelir: 0, gider: 0 });
      const b = map.get(k)!;
      const a = Number(t.amount);
      if (t.category === "gelir") b.gelir += a;
      else b.gider += a;
    }
    const keys = Array.from(map.keys()).sort();
    return keys.map((k) => ({
      label: new Date(k + "T12:00:00").toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "short",
      }),
      gelir: map.get(k)!.gelir,
      gider: map.get(k)!.gider,
    }));
  }, [filtered]);

  const trendLast6Months: TrendMonthRow[] = useMemo(() => {
    const now = new Date();
    const rows: TrendMonthRow[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const label = d.toLocaleDateString("tr-TR", { month: "short", year: "2-digit" });
      let gelir = 0;
      let gider = 0;
      for (const t of transactions) {
        const td = new Date(t.date + "T12:00:00");
        if (td.getFullYear() !== y || td.getMonth() !== m) continue;
        const a = Number(t.amount);
        if (t.category === "gelir") gelir += a;
        else if (t.category === "gider") gider += a;
      }
      rows.push({ label, gelir, gider, net: gelir - gider });
    }
    return rows;
  }, [transactions]);

  const categoryPieData: CategorySlice[] = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of filtered) {
      if (t.category !== "gider") continue;
      const tag = (t.category_tag?.trim() || "Diğer").replace(/^Diğer Gider$/i, "Diğer");
      const key = tag || "Diğer";
      m.set(key, (m.get(key) ?? 0) + Number(t.amount));
    }
    return Array.from(m.entries())
      .map(([name, value]) => ({
        name,
        value,
        color: tagColorFor(name === "Diğer" ? "Diğer Gider" : name),
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  const topGiderTags = useMemo(() => {
    const list = [...categoryPieData].sort((a, b) => b.value - a.value).slice(0, 5);
    const max = list[0]?.value ?? 1;
    return list.map((d) => ({ ...d, pct: max > 0 ? Math.round((d.value / max) * 100) : 0 }));
  }, [categoryPieData]);

  const barData: AvPoint[] = useMemo(() => {
    const map = new Map<string, { alacak: number; verecek: number }>();
    for (const t of filtered) {
      if (t.category !== "alacak" && t.category !== "verecek") continue;
      const k = monthKey(t.date);
      if (!map.has(k)) map.set(k, { alacak: 0, verecek: 0 });
      const b = map.get(k)!;
      const a = Number(t.amount);
      if (t.category === "alacak") b.alacak += a;
      else b.verecek += a;
    }
    const keys = Array.from(map.keys()).sort();
    return keys.map((k) => {
      const [y, mo] = k.split("-").map(Number);
      return {
        label: new Date(y, mo - 1, 1).toLocaleDateString("tr-TR", {
          month: "short",
          year: "2-digit",
        }),
        alacak: map.get(k)!.alacak,
        verecek: map.get(k)!.verecek,
      };
    });
  }, [filtered]);

  const topAlacakByAmount = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of filtered) {
      if (t.category !== "alacak") continue;
      const name = t.contacts?.name;
      if (!name) continue;
      m.set(name, (m.get(name) ?? 0) + Number(t.amount));
    }
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [filtered]);

  const topVerecekByAmount = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of filtered) {
      if (t.category !== "verecek") continue;
      const name = t.contacts?.name;
      if (!name) continue;
      m.set(name, (m.get(name) ?? 0) + Number(t.amount));
    }
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [filtered]);

  if (!initialized || (loading && transactions.length === 0)) {
    return (
      <PageShell
        title="Rapor"
        variant="narrow"
        contentClassName="flex flex-col gap-4"
        titleClassName="hidden md:block"
      >
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </PageShell>
    );
  }

  const trendHasData = trendLast6Months.some((r) => r.gelir > 0 || r.gider > 0);

  return (
    <PageShell
      title="Rapor"
      variant="narrow"
      contentClassName="flex flex-col gap-5 pb-6"
      titleClassName="hidden md:block"
    >
      <div className="flex flex-wrap gap-2">
        {PERIOD_BTN.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPeriod(p.id)}
            className={[
              "rounded-full px-4 py-2.5 text-xs font-bold transition-colors",
              period === p.id
                ? "bg-[var(--sd-primary)] text-white shadow-sm"
                : "shadow-[var(--sd-shadow)]",
            ].join(" ")}
            style={
              period === p.id
                ? undefined
                : { background: "var(--bg-card)", color: "var(--text-secondary)" }
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      <section className="space-y-2">
        <h2 className="sd-heading text-lg text-[var(--text-primary)]">🧠 Akıllı analiz</h2>
        <SmartPredictions transactions={transactions} />
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-bold uppercase text-[var(--text-secondary)]">Toplam gelir</p>
          <p className="sd-num sd-heading mt-1 text-lg text-[var(--sd-gelir)]">
            {formatTry(summary.gelir)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold uppercase text-[var(--text-secondary)]">Toplam gider</p>
          <p className="sd-num sd-heading mt-1 text-lg text-[var(--sd-gider)]">
            {formatTry(summary.gider)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold uppercase text-[var(--text-secondary)]">Net (gelir−gider)</p>
          <p className="sd-num sd-heading mt-1 text-lg">{formatTry(summary.net)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold uppercase text-[var(--text-secondary)]">Tasarruf oranı</p>
          <p className="sd-num sd-heading mt-1 text-lg text-[var(--sd-primary)]">
            %{summary.tasarruf}
          </p>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="sd-heading mb-3 text-lg">Gelir vs gider (son 6 ay)</h2>
        {!trendHasData ? (
          <p className="text-sm text-[var(--text-secondary)]">Veri yok.</p>
        ) : (
          <TrendChart data={trendLast6Months} />
        )}
      </Card>

      <Card className="p-4">
        <h2 className="sd-heading mb-3 text-lg">Gelir vs gider (seçili dönem)</h2>
        {areaData.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">Veri yok.</p>
        ) : (
          <GelirGiderArea data={areaData} />
        )}
      </Card>

      <Card className="p-4">
        <h2 className="sd-heading mb-3 text-lg">Sektörel dağılım (gider)</h2>
        {categoryPieData.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">Bu dönemde etiketli gider yok.</p>
        ) : (
          <CategoryChart data={categoryPieData} />
        )}
      </Card>

      <Card className="p-4">
        <h2 className="sd-heading mb-3 text-lg">En çok harcama (üst 5)</h2>
        {topGiderTags.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">Veri yok.</p>
        ) : (
          <ul className="space-y-3">
            {topGiderTags.map((row, i) => (
              <li key={row.name}>
                <div className="mb-1 flex items-center justify-between text-sm font-bold">
                  <span>
                    {i + 1}. {row.name}
                  </span>
                  <span className="sd-num text-[var(--sd-gider)]">{formatTry(row.value)}</span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full"
                  style={{ background: "var(--border-color)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${row.pct}%`,
                      backgroundColor: row.color,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="p-4">
          <h2 className="sd-heading mb-3 text-lg">En çok alacak (kişi)</h2>
          {topAlacakByAmount.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">Veri yok.</p>
          ) : (
            <ol className="space-y-2">
              {topAlacakByAmount.map(([name, sum], i) => (
                <li
                  key={name}
                  className="flex items-center justify-between rounded-xl bg-[var(--sd-bg)] px-3 py-2 text-sm font-bold"
                >
                  <span className="text-[var(--sd-alacak)]">
                    {i + 1}. {name}
                  </span>
                  <span className="sd-num">{formatTry(sum)}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
        <Card className="p-4">
          <h2 className="sd-heading mb-3 text-lg">En çok verecek (kişi)</h2>
          {topVerecekByAmount.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">Veri yok.</p>
          ) : (
            <ol className="space-y-2">
              {topVerecekByAmount.map(([name, sum], i) => (
                <li
                  key={name}
                  className="flex items-center justify-between rounded-xl bg-[var(--sd-bg)] px-3 py-2 text-sm font-bold"
                >
                  <span className="text-[var(--sd-verecek)]">
                    {i + 1}. {name}
                  </span>
                  <span className="sd-num">{formatTry(sum)}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="sd-heading mb-3 text-lg">Alacak vs verecek (aylık)</h2>
        {barData.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">Veri yok.</p>
        ) : (
          <AlacakVerecekBar data={barData} />
        )}
      </Card>
    </PageShell>
  );
}
