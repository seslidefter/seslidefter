"use client";

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

const MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const DAYS = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];

type CalDay =
  | null
  | {
      key: string;
      num: number;
      dayOfWeek: number;
      data?: { income: number; expense: number; count: number };
      isToday: boolean;
      isSelected: boolean;
    };

export function MiniCalendar({
  transactions,
  selectedDate,
  onSelect,
  currentMonth,
  onMonthChange,
}: MiniCalendarProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => currentMonth.getFullYear());
  const [pickerPos, setPickerPos] = useState({ top: 0, left: 0, width: 300 });
  const monthBtnRef = useRef<HTMLButtonElement>(null);

  const today = new Date().toISOString().split("T")[0]!;
  const todayMonth = new Date().getMonth();
  const todayYear = new Date().getFullYear();

  const calData = useMemo(() => {
    const map: Record<string, { income: number; expense: number; count: number }> = {};
    for (const t of transactions) {
      const key = t.date?.slice(0, 10);
      if (!key) continue;
      if (!map[key]) map[key] = { income: 0, expense: 0, count: 0 };
      if (t.category === "gelir") map[key].income += Number(t.amount);
      if (t.category === "gider") map[key].expense += Number(t.amount);
      map[key].count++;
    }
    return map;
  }, [transactions]);

  const calendarDays = useMemo((): CalDay[] => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let startOffset = firstDayOfMonth.getDay() - 1;
    if (startOffset < 0) startOffset = 6;

    const days: CalDay[] = [];
    for (let i = 0; i < startOffset; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        key,
        num: d,
        dayOfWeek: date.getDay(), // used for future locale-specific layout
        data: calData[key],
        isToday: key === today,
        isSelected: key === selectedDate,
      });
    }
    return days;
  }, [currentMonth, calData, selectedDate, today]);

  function openPicker() {
    if (monthBtnRef.current) {
      const rect = monthBtnRef.current.getBoundingClientRect();
      setPickerPos({
        top: rect.bottom + 8,
        left: Math.max(8, rect.left + rect.width / 2 - 150),
        width: 300,
      });
    }
    setPickerYear(currentMonth.getFullYear());
    setShowPicker(true);
  }

  useEffect(() => {
    if (!showPicker) return;
    function close(e: MouseEvent) {
      const el = e.target as Element;
      if (!el.closest(".cal-picker-portal") && !el.closest(".cal-month-btn")) {
        setShowPicker(false);
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [showPicker]);

  return (
    <div className="mb-4 overflow-visible rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700">
        <button
          type="button"
          onClick={() => onMonthChange(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-lg font-bold text-gray-600 transition-all hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          aria-label="Önceki ay"
        >
          ‹
        </button>

        <button
          type="button"
          ref={monthBtnRef}
          onClick={openPicker}
          className="cal-month-btn flex items-center gap-2 rounded-xl bg-green-50 px-4 py-1.5 text-sm font-bold text-green-700 transition-all hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
        >
          <span>{currentMonth.toLocaleDateString("tr-TR", { month: "long" })}</span>
          <span className="font-normal text-gray-400">{currentMonth.getFullYear()}</span>
          <span className="text-xs text-green-600 dark:text-green-400">{showPicker ? "▲" : "▼"}</span>
        </button>

        <button
          type="button"
          onClick={() => onMonthChange(1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-lg font-bold text-gray-600 transition-all hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          aria-label="Sonraki ay"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 px-3 pt-2">
        {DAYS.map((d) => (
          <div key={d} className="py-1 text-center text-xs font-bold text-gray-400 dark:text-gray-500">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 p-3">
        {calendarDays.map((day, i) => {
          if (!day) {
            return <div key={`empty-${i}`} className="aspect-square" />;
          }

          const hasIncome = (day.data?.income ?? 0) > 0;
          const hasExpense = (day.data?.expense ?? 0) > 0;
          const hasData = hasIncome || hasExpense;

          return (
            <button
              key={day.key}
              type="button"
              onClick={() => onSelect(day.isSelected ? null : day.key)}
              className={[
                "relative flex aspect-square flex-col items-center justify-center rounded-xl text-xs font-semibold transition-all",
                day.isSelected
                  ? "bg-green-600 text-white shadow-md"
                  : day.isToday
                    ? "bg-green-100 text-green-700 ring-2 ring-green-500 dark:bg-green-900/40 dark:text-green-300"
                    : hasData
                      ? "bg-gray-50 text-gray-900 hover:bg-green-50 dark:bg-gray-700/50 dark:text-white dark:hover:bg-gray-700/50"
                      : "text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700/30",
              ].join(" ")}
            >
              <span
                className={`leading-none ${day.isToday ? "text-sm font-black" : "text-sm font-semibold"}`}
              >
                {day.num}
              </span>
              {hasData ? (
                <div className="mt-0.5 flex gap-0.5">
                  {hasIncome ? (
                    <span
                      className={`h-1 w-1 rounded-full ${day.isSelected ? "bg-white" : "bg-green-500"}`}
                    />
                  ) : null}
                  {hasExpense ? (
                    <span
                      className={`h-1 w-1 rounded-full ${day.isSelected ? "bg-red-200" : "bg-red-500"}`}
                    />
                  ) : null}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

      {selectedDate && calData[selectedDate] ? (
        <div className="flex items-center justify-between rounded-b-2xl border-t border-green-100 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-900/20">
          <span className="text-sm font-bold text-green-800 dark:text-green-300">
            {new Date(selectedDate + "T12:00:00").toLocaleDateString("tr-TR", {
              day: "numeric",
              month: "long",
            })}
          </span>
          <div className="flex items-center gap-3">
            {calData[selectedDate].income > 0 ? (
              <span className="text-sm font-bold text-green-600 dark:text-green-400">
                +₺{calData[selectedDate].income.toLocaleString("tr-TR")}
              </span>
            ) : null}
            {calData[selectedDate].expense > 0 ? (
              <span className="text-sm font-bold text-red-500">
                -₺{calData[selectedDate].expense.toLocaleString("tr-TR")}
              </span>
            ) : null}
            <span className="rounded-full bg-white px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
              {calData[selectedDate].count} işlem
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
                width: pickerPos.width,
                zIndex: 9999,
              }}
            >
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-2xl dark:border-gray-700 dark:bg-gray-800">
                <div className="mb-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setPickerYear((y) => y - 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  >
                    ‹
                  </button>
                  <span className="text-lg font-black text-gray-900 dark:text-white">{pickerYear}</span>
                  <button
                    type="button"
                    onClick={() => setPickerYear((y) => y + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300"
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
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600",
                        ].join(" ")}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
                  {[
                    {
                      label: "Bu Ay",
                      action: () => {
                        const d = new Date();
                        const diff =
                          (d.getFullYear() - currentMonth.getFullYear()) * 12 +
                          (d.getMonth() - currentMonth.getMonth());
                        if (diff !== 0) onMonthChange(diff);
                        setShowPicker(false);
                      },
                    },
                    {
                      label: "Geçen Ay",
                      action: () => {
                        const d = new Date();
                        d.setMonth(d.getMonth() - 1);
                        const diff =
                          (d.getFullYear() - currentMonth.getFullYear()) * 12 +
                          (d.getMonth() - currentMonth.getMonth());
                        if (diff !== 0) onMonthChange(diff);
                        setShowPicker(false);
                      },
                    },
                  ].map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={s.action}
                      className="flex-1 rounded-xl bg-gray-100 py-2 text-xs font-bold text-gray-600 transition-all hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
