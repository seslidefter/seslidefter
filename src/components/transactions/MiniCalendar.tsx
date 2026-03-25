"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface MiniCalendarTransaction {
  date: string;
  category: string;
  amount: number;
}

export interface MiniCalendarProps {
  transactions: MiniCalendarTransaction[];
  selectedDate: string | null;
  onSelect: (date: string | null) => void;
  currentMonth: Date;
  onMonthChange: (deltaMonths: number) => void;
}

type DayData = {
  income: number;
  expense: number;
  count: number;
  net: number;
};

const MONTHS_TR = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function MiniCalendar({
  transactions,
  selectedDate,
  onSelect,
  currentMonth,
  onMonthChange,
}: MiniCalendarProps) {
  const { language, t } = useLanguage();
  const localeTag = language === "en" ? "en-US" : "tr-TR";
  const MONTHS = language === "en" ? MONTHS_EN : MONTHS_TR;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => currentMonth.getFullYear());
  const [pickerPos, setPickerPos] = useState({ top: 0, left: 0 });
  const monthBtnRef = useRef<HTMLButtonElement>(null);

  const today = useMemo(
    () =>
      typeof window === "undefined" ? "__none__" : (new Date().toISOString().split("T")[0] ?? "__none__"),
    []
  );
  const todayMonth = useMemo(
    () => (typeof window === "undefined" ? -1 : new Date().getMonth()),
    []
  );
  const todayYear = useMemo(
    () => (typeof window === "undefined" ? -1 : new Date().getFullYear()),
    []
  );

  const calData = useMemo(() => {
    const map: Record<string, DayData> = {};
    for (const tx of transactions) {
      const key = tx.date?.slice(0, 10);
      if (!key) continue;
      if (!map[key]) map[key] = { income: 0, expense: 0, count: 0, net: 0 };
      if (tx.category === "gelir") {
        map[key].income += Number(tx.amount);
        map[key].net += Number(tx.amount);
      }
      if (tx.category === "gider") {
        map[key].expense += Number(tx.amount);
        map[key].net -= Number(tx.amount);
      }
      map[key].count++;
    }
    return map;
  }, [transactions]);

  const days = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const count = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: count }, (_, i) => {
      const d = i + 1;
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const date = new Date(year, month, d);
      return {
        key,
        num: d,
        dayName: date.toLocaleDateString(localeTag, { weekday: "short" }),
        data: calData[key],
        isToday: key === today,
        isSelected: key === selectedDate,
      };
    });
  }, [currentMonth, calData, selectedDate, today, localeTag]);

  useEffect(() => {
    const todayEl = scrollRef.current?.querySelector('[data-today="true"]');
    if (todayEl) {
      todayEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [currentMonth]);

  useEffect(() => {
    if (!selectedDate) return;
    const sel = scrollRef.current?.querySelector('[data-selected="true"]');
    sel?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [selectedDate]);

  function openPicker() {
    if (monthBtnRef.current) {
      const rect = monthBtnRef.current.getBoundingClientRect();
      setPickerPos({
        top: rect.bottom + 8,
        left: Math.max(8, Math.min(rect.left + rect.width / 2 - 150, window.innerWidth - 308)),
      });
    }
    setPickerYear(currentMonth.getFullYear());
    setShowPicker(true);
  }

  useEffect(() => {
    if (!showPicker) return;
    function close(e: MouseEvent) {
      const el = e.target as Element;
      if (!el.closest(".cal-picker-portal") && !el.closest(".mcal-month-btn")) {
        setShowPicker(false);
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [showPicker]);

  const pickerThisMonth = language === "en" ? "This month" : "Bu Ay";
  const pickerLastMonth = language === "en" ? "Last month" : "Geçen Ay";
  const prevMonthAria = language === "en" ? "Previous month" : "Önceki ay";
  const nextMonthAria = language === "en" ? "Next month" : "Sonraki ay";

  return (
    <div
      suppressHydrationWarning
      className="mb-4 overflow-visible rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700">
        <button
          type="button"
          onClick={() => onMonthChange(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-lg font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300"
          aria-label={prevMonthAria}
        >
          ‹
        </button>

        <button
          type="button"
          ref={monthBtnRef}
          onClick={openPicker}
          suppressHydrationWarning
          className="mcal-month-btn flex items-center gap-2 rounded-xl bg-green-50 px-4 py-1.5 text-sm font-bold text-green-700 transition-all hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
        >
          <span suppressHydrationWarning>
            {currentMonth.toLocaleDateString(localeTag, { month: "long" })}
          </span>
          <span className="font-normal text-gray-400" suppressHydrationWarning>
            {currentMonth.getFullYear()}
          </span>
          <span className="text-xs">{showPicker ? "▲" : "▼"}</span>
        </button>

        <button
          type="button"
          onClick={() => onMonthChange(1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-lg font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300"
          aria-label={nextMonthAria}
        >
          ›
        </button>
      </div>

      <div
        ref={scrollRef}
        suppressHydrationWarning
        className="scrollbar-hide flex gap-2 overflow-x-auto px-3 py-3"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {days.map((day) => {
          const hasData = !!day.data;
          const net = day.data?.net ?? 0;
          const isPositive = net >= 0;

          return (
            <button
              key={day.key}
              type="button"
              data-today={day.isToday ? "true" : undefined}
              data-selected={day.isSelected ? "true" : undefined}
              onClick={() => onSelect(day.isSelected ? null : day.key)}
              style={{ scrollSnapAlign: "center" }}
              className={[
                "flex min-w-[60px] flex-shrink-0 flex-col items-center rounded-2xl border-2 px-2 py-2 transition-all duration-150",
                day.isSelected
                  ? "border-green-600 bg-green-600 text-white shadow-lg shadow-green-500/30"
                  : day.isToday
                    ? "border-green-400 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : hasData
                      ? "border-gray-200 bg-gray-50 text-gray-700 hover:border-green-300 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-300"
                      : "border-transparent bg-transparent text-gray-400 hover:bg-gray-50 dark:text-gray-500 dark:hover:bg-gray-700/30",
              ].join(" ")}
            >
              <span
                className={[
                  "mb-1 text-[10px] font-semibold",
                  day.isSelected ? "text-white/80" : "text-gray-400 dark:text-gray-500",
                ].join(" ")}
              >
                {day.dayName}
              </span>

              <span
                className={[
                  "mb-1 text-lg font-black leading-none",
                  day.isToday && !day.isSelected ? "text-green-600 dark:text-green-400" : "",
                ].join(" ")}
              >
                {day.num}
              </span>

              {hasData ? (
                <div className="mb-1 flex gap-0.5">
                  {day.data!.income > 0 ? (
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${day.isSelected ? "bg-white" : "bg-green-500"}`}
                    />
                  ) : null}
                  {day.data!.expense > 0 ? (
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${day.isSelected ? "bg-red-200" : "bg-red-500"}`}
                    />
                  ) : null}
                </div>
              ) : null}

              {hasData ? (
                <span
                  className={[
                    "text-[9px] font-bold leading-none",
                    day.isSelected
                      ? "text-white/90"
                      : isPositive
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-500",
                  ].join(" ")}
                >
                  {isPositive ? "+" : ""}
                  {Math.abs(net) >= 1000
                    ? `${(net / 1000).toFixed(1)}k`
                    : net.toLocaleString(localeTag)}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {selectedDate && calData[selectedDate] ? (
        <div
          suppressHydrationWarning
          className="flex flex-wrap items-center justify-between gap-2 rounded-b-2xl border-t border-green-100 bg-green-50 px-4 py-2.5 dark:border-green-800 dark:bg-green-900/20"
        >
          <span className="text-xs font-bold text-green-800 dark:text-green-300">
            {new Date(selectedDate + "T12:00:00").toLocaleDateString(localeTag, {
              day: "numeric",
              month: "long",
            })}
          </span>
          <div className="flex flex-wrap items-center gap-3">
            {calData[selectedDate].income > 0 ? (
              <span className="text-xs font-bold text-green-600 dark:text-green-400">
                +₺{calData[selectedDate].income.toLocaleString(localeTag)}
              </span>
            ) : null}
            {calData[selectedDate].expense > 0 ? (
              <span className="text-xs font-bold text-red-500">
                -₺{calData[selectedDate].expense.toLocaleString(localeTag)}
              </span>
            ) : null}
            <span
              className={[
                "text-xs font-black",
                calData[selectedDate].net >= 0 ? "text-green-700 dark:text-green-300" : "text-red-600",
              ].join(" ")}
            >
              Net: {calData[selectedDate].net >= 0 ? "+" : ""}₺
              {calData[selectedDate].net.toLocaleString(localeTag)}
            </span>
            <span className="rounded-full bg-white px-2 py-0.5 text-xs text-gray-400 dark:bg-gray-700 dark:text-gray-400">
              {t("transactions.txnCount", { count: calData[selectedDate].count })}
            </span>
          </div>
        </div>
      ) : null}

      {showPicker && typeof document !== "undefined"
        ? createPortal(
            <div
              className="cal-picker-portal"
              style={{
                position: "fixed",
                top: pickerPos.top,
                left: pickerPos.left,
                width: 300,
                zIndex: 9999,
              }}
            >
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-2xl dark:border-gray-700 dark:bg-gray-800">
                <div className="mb-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setPickerYear((y) => y - 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 font-bold dark:bg-gray-700"
                  >
                    ‹
                  </button>
                  <span className="text-lg font-black text-gray-900 dark:text-white">{pickerYear}</span>
                  <button
                    type="button"
                    onClick={() => setPickerYear((y) => y + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 font-bold dark:bg-gray-700"
                  >
                    ›
                  </button>
                </div>
                <div className="mb-3 grid grid-cols-4 gap-1.5">
                  {MONTHS.map((m, mi) => {
                    const isActive =
                      mi === currentMonth.getMonth() && pickerYear === currentMonth.getFullYear();
                    const isCurrent = mi === todayMonth && pickerYear === todayYear;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          const diff =
                            (pickerYear - currentMonth.getFullYear()) * 12 +
                            (mi - currentMonth.getMonth());
                          if (diff !== 0) onMonthChange(diff);
                          setShowPicker(false);
                        }}
                        className={[
                          "rounded-xl py-2 text-xs font-bold transition-all",
                          isActive
                            ? "bg-green-600 text-white"
                            : isCurrent
                              ? "bg-green-100 text-green-700 ring-1 ring-green-500 dark:bg-green-900/40 dark:text-green-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
                        ].join(" ")}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      const diff =
                        (d.getFullYear() - currentMonth.getFullYear()) * 12 +
                        (d.getMonth() - currentMonth.getMonth());
                      if (diff !== 0) onMonthChange(diff);
                      setShowPicker(false);
                    }}
                    className="flex-1 rounded-xl bg-gray-100 py-2 text-xs font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                  >
                    {pickerThisMonth}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setMonth(d.getMonth() - 1);
                      const diff =
                        (d.getFullYear() - currentMonth.getFullYear()) * 12 +
                        (d.getMonth() - currentMonth.getMonth());
                      if (diff !== 0) onMonthChange(diff);
                      setShowPicker(false);
                    }}
                    className="flex-1 rounded-xl bg-gray-100 py-2 text-xs font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                  >
                    {pickerLastMonth}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
