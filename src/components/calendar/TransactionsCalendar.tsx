"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { errToast } from "@/lib/sd-toast";
import { formatTry, formatDateTr } from "@/lib/utils";
import type { TransactionRow } from "@/types/database";
import { useAuthStore } from "@/store/authStore";
import { useTransactionStore } from "@/store/transactionStore";

const TR_MONTHS = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function isoDate(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function parseISO(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

function weekdayMon(d: Date) {
  return (d.getDay() + 6) % 7;
}

export function TransactionsCalendar({ embedded = false }: { embedded?: boolean }) {
  const initialized = useAuthStore((s) => s.initialized);
  const transactions = useTransactionStore((s) => s.transactions);
  const loading = useTransactionStore((s) => s.loading);
  const fetchAll = useTransactionStore((s) => s.fetchAll);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState(() => isoDate(now.getFullYear(), now.getMonth(), now.getDate()));

  const load = useCallback(() => {
    void fetchAll().then((r) => {
      if (r.error) errToast(r.error);
    });
  }, [fetchAll]);

  useEffect(() => {
    load();
  }, [load]);

  const byDate = useMemo(() => {
    const m = new Map<string, TransactionRow[]>();
    for (const t of transactions) {
      const k = t.date;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(t);
    }
    return m;
  }, [transactions]);

  const calendar = useMemo(() => {
    const first = new Date(year, month, 1);
    const startOffset = weekdayMon(first);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: { date: string | null; inMonth: boolean }[] = [];
    for (let i = 0; i < startOffset; i++) cells.push({ date: null, inMonth: false });
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: isoDate(year, month, d), inMonth: true });
    }
    while (cells.length % 7 !== 0) cells.push({ date: null, inMonth: false });
    while (cells.length < 42) cells.push({ date: null, inMonth: false });
    return cells;
  }, [year, month]);

  const weekStrip = useMemo(() => {
    const base = parseISO(selected);
    const mon = new Date(base);
    mon.setDate(base.getDate() - weekdayMon(base));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      return isoDate(d.getFullYear(), d.getMonth(), d.getDate());
    });
  }, [selected]);

  const weekTotals = useMemo(() => {
    let pos = 0,
      neg = 0;
    for (const day of weekStrip) {
      const list = byDate.get(day) ?? [];
      for (const t of list) {
        const a = Number(t.amount);
        if (t.category === "gelir" || t.category === "alacak") pos += a;
        if (t.category === "gider" || t.category === "verecek") neg += a;
      }
    }
    return { pos, neg };
  }, [byDate, weekStrip]);

  const dayList = selected ? (byDate.get(selected) ?? []) : [];

  const dotsForDay = (date: string | null) => {
    if (!date) return { g: false, r: false };
    const list = byDate.get(date) ?? [];
    let g = false,
      r = false;
    for (const t of list) {
      if (t.category === "gelir" || t.category === "alacak") g = true;
      if (t.category === "gider" || t.category === "verecek") r = true;
    }
    return { g, r };
  };

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };

  if (!initialized || (loading && transactions.length === 0)) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="sd-calendar-container h-72 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div
      className={
        embedded
          ? "space-y-4 pb-40 md:pb-4"
          : "sd-page-container mx-auto max-w-lg space-y-4 pb-28"
      }
    >
      {!embedded ? (
        <h1 className="sd-heading hidden text-2xl text-[var(--text-primary)] md:block">Takvim</h1>
      ) : null}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="rounded-xl p-2 text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--text-primary)_6%,transparent)]"
          aria-label="Önceki ay"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <p className="sd-heading text-lg text-[var(--text-primary)]">
          {TR_MONTHS[month]} {year}
        </p>
        <button
          type="button"
          onClick={nextMonth}
          className="rounded-xl p-2 text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--text-primary)_6%,transparent)]"
          aria-label="Sonraki ay"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>

      <Card className="sd-calendar-container overflow-hidden p-3">
        <div className="mb-2 grid grid-cols-7 text-center text-[11px] font-bold text-[var(--text-secondary)]">
          {["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="sd-calendar-grid grid w-full grid-cols-7 gap-1">
          {calendar.map((cell, i) => {
            const { g, r } = dotsForDay(cell.date);
            const sel = cell.date === selected;
            return (
              <button
                key={i}
                type="button"
                disabled={!cell.date}
                onClick={() => cell.date && setSelected(cell.date)}
                className={[
                  "sd-calendar-day relative flex min-h-0 min-w-0 flex-col items-center justify-start overflow-hidden rounded-xl py-1 text-sm font-bold transition-colors aspect-square",
                  !cell.inMonth && cell.date ? "text-[var(--text-secondary)] opacity-50" : "",
                  !cell.date ? "pointer-events-none opacity-0" : "",
                  sel
                    ? "bg-[var(--sd-primary)] text-white"
                    : "text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--text-primary)_6%,transparent)]",
                ].join(" ")}
              >
                {cell.date ? (
                  <>
                    <span>{parseInt(cell.date.split("-")[2]!, 10)}</span>
                    <span className="mt-0.5 flex gap-0.5">
                      {g ? (
                        <span
                          className={[
                            "h-1.5 w-1.5 shrink-0 rounded-full",
                            sel ? "bg-white" : "bg-[var(--sd-gelir)]",
                          ].join(" ")}
                        />
                      ) : null}
                      {r ? (
                        <span
                          className={[
                            "h-1.5 w-1.5 shrink-0 rounded-full",
                            sel ? "bg-orange-200" : "bg-[var(--sd-gider)]",
                          ].join(" ")}
                        />
                      ) : null}
                    </span>
                  </>
                ) : null}
              </button>
            );
          })}
        </div>
      </Card>

      <div>
        <p className="mb-2 text-xs font-bold uppercase text-[var(--text-secondary)]">Haftalık özet</p>
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {weekStrip.map((d) => {
            const list = byDate.get(d) ?? [];
            const active = d === selected;
            const dd = parseISO(d);
            return (
              <button
                key={d}
                type="button"
                onClick={() => setSelected(d)}
                className={[
                  "flex min-w-[72px] shrink-0 flex-col rounded-xl border px-2 py-2 text-center transition-colors",
                  active
                    ? "border-[var(--sd-primary)] bg-[color-mix(in_srgb,var(--sd-primary)_12%,var(--bg-card))]"
                    : "border-[var(--border-color)] bg-[var(--bg-card)]",
                ].join(" ")}
              >
                <span className="text-[10px] font-bold text-[var(--text-secondary)]">
                  {dd.toLocaleDateString("tr-TR", { weekday: "short" })}
                </span>
                <span className="text-sm font-bold text-[var(--text-primary)]">{dd.getDate()}</span>
                <span className="text-[10px] font-semibold text-[var(--text-secondary)]">
                  {list.length} işlem
                </span>
              </button>
            );
          })}
        </div>
        <Card className="mt-2 flex justify-between border-[var(--border-color)] p-3 text-xs font-bold">
          <span className="text-[var(--sd-gelir)]">+ {formatTry(weekTotals.pos)}</span>
          <span className="text-[var(--sd-gider)]">− {formatTry(weekTotals.neg)}</span>
        </Card>
      </div>

      <div className="sd-calendar-drawer md:static md:z-auto">
        <Card className="max-h-[min(40vh,320px)] overflow-y-auto border-[var(--border-color)] p-4 shadow-xl md:max-h-none md:shadow-[var(--sd-shadow)]">
          <p className="mb-2 font-bold text-[var(--text-primary)]">
            {formatDateTr(parseISO(selected), { dateStyle: "full" })}
          </p>
          {dayList.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">Bu gün işlem yok.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {dayList.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-2 rounded-xl px-3 py-2"
                  style={{ background: "var(--bg-primary)" }}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[var(--text-primary)]">
                      {t.contacts?.name ?? "Genel"}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">{t.category}</p>
                  </div>
                  <p className="sd-num shrink-0 text-sm font-bold text-[var(--text-primary)]">
                    {formatTry(Number(t.amount))}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
