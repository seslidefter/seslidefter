"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

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
  /** Ay değişimi: −1 önceki ay, +1 sonraki ay veya picker’dan gelen tam fark */
  onMonthChange: (deltaMonths: number) => void;
}

const MONTHS_TR = [
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

const PICKER_WIDTH = 300;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function localIso(y: number, m0: number, d: number) {
  return `${y}-${pad(m0 + 1)}-${pad(d)}`;
}

function todayLocalIso() {
  const t = new Date();
  return localIso(t.getFullYear(), t.getMonth(), t.getDate());
}

function dateKey(raw: string): string {
  return raw.length >= 10 ? raw.slice(0, 10) : raw;
}

export function MiniCalendar({
  transactions,
  selectedDate,
  onSelect,
  currentMonth,
  onMonthChange,
}: MiniCalendarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const monthBtnRef = useRef<HTMLButtonElement>(null);

  const [showPicker, setShowPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => currentMonth.getFullYear());
  const [pickerPos, setPickerPos] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function openPicker() {
    if (showPicker) {
      setShowPicker(false);
      return;
    }
    const btn = monthBtnRef.current;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      let left = rect.left + rect.width / 2 - PICKER_WIDTH / 2;
      if (left < 8) left = 8;
      if (left + PICKER_WIDTH > windowWidth - 8) {
        left = windowWidth - PICKER_WIDTH - 8;
      }
      setPickerPos({
        top: rect.bottom + 8,
        left,
      });
    }
    setPickerYear(currentMonth.getFullYear());
    setShowPicker(true);
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Element;
      if (!target.closest(".mcal-picker-portal") && !target.closest(".mcal-month-btn")) {
        setShowPicker(false);
      }
    }
    if (showPicker) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [showPicker]);

  useEffect(() => {
    if (!showPicker) return;
    const close = () => setShowPicker(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [showPicker]);

  const calData = useMemo(() => {
    const map: Record<string, { income: number; expense: number; count: number }> = {};
    for (const t of transactions) {
      const key = dateKey(t.date);
      if (!key) continue;
      if (!map[key]) map[key] = { income: 0, expense: 0, count: 0 };
      const a = Number(t.amount);
      if (t.category === "gelir" || t.category === "alacak") map[key].income += a;
      if (t.category === "gider" || t.category === "verecek") map[key].expense += a;
      map[key].count++;
    }
    return map;
  }, [transactions]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const todayKey = todayLocalIso();

  const days = useMemo(() => {
    const count = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: count }, (_, i) => {
      const d = i + 1;
      const key = localIso(year, month, d);
      const cell = calData[key];
      const dt = new Date(year, month, d);
      return {
        key,
        num: d,
        dayName: dt.toLocaleDateString("tr-TR", { weekday: "short" }),
        income: cell?.income ?? 0,
        expense: cell?.expense ?? 0,
        count: cell?.count ?? 0,
        isToday: key === todayKey,
        isSelected: key === selectedDate,
      };
    });
  }, [year, month, calData, selectedDate, todayKey]);

  useEffect(() => {
    const el = scrollRef.current?.querySelector(".mcal-day.today");
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [year, month]);

  const summary = selectedDate ? calData[selectedDate] : null;

  function selectMonthYear(m0: number, y: number) {
    const diff = (y - currentMonth.getFullYear()) * 12 + (m0 - currentMonth.getMonth());
    if (diff !== 0) onMonthChange(diff);
    setShowPicker(false);
  }

  const pickerInnerStyle: CSSProperties = {
    background: "var(--bg-card, #fff)",
    borderRadius: 16,
    border: "1px solid var(--border-color, #e5e7eb)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.18)",
    padding: 14,
    animation: "fadeIn 150ms ease",
  };

  const pickerPortal =
    mounted && showPicker && typeof document !== "undefined"
      ? createPortal(
          <div
            className="mcal-picker-portal"
            style={{
              position: "fixed",
              top: pickerPos.top,
              left: pickerPos.left,
              width: PICKER_WIDTH,
              zIndex: 9999,
            }}
            role="dialog"
            aria-label="Ay ve yıl seç"
          >
            <div style={pickerInnerStyle}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <button
                  type="button"
                  onClick={() => setPickerYear((y) => y - 1)}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: "var(--bg-secondary, #f3f4f6)",
                    fontSize: 18,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-primary, #111)",
                    border: "none",
                    cursor: "pointer",
                  }}
                  aria-label="Önceki yıl"
                >
                  ‹
                </button>
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: "var(--text-primary, #111)",
                  }}
                >
                  {pickerYear}
                </span>
                <button
                  type="button"
                  onClick={() => setPickerYear((y) => y + 1)}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: "var(--bg-secondary, #f3f4f6)",
                    fontSize: 18,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-primary, #111)",
                    border: "none",
                    cursor: "pointer",
                  }}
                  aria-label="Sonraki yıl"
                >
                  ›
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 6,
                  marginBottom: 12,
                }}
              >
                {MONTHS_TR.map((monthName, i) => {
                  const isActive = i === currentMonth.getMonth() && pickerYear === currentMonth.getFullYear();
                  const isCurrentMonth =
                    i === new Date().getMonth() && pickerYear === new Date().getFullYear();
                  return (
                    <button
                      key={monthName}
                      type="button"
                      onClick={() => selectMonthYear(i, pickerYear)}
                      style={{
                        padding: "8px 4px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: isActive ? 700 : 600,
                        background: isActive
                          ? "#2E7D32"
                          : isCurrentMonth
                            ? "transparent"
                            : "var(--bg-secondary, #f3f4f6)",
                        color: isActive ? "#fff" : isCurrentMonth ? "#2E7D32" : "var(--text-primary, #111)",
                        border:
                          isCurrentMonth && !isActive ? "2px solid #2E7D32" : "2px solid transparent",
                        cursor: "pointer",
                        transition: "all 150ms",
                        textAlign: "center",
                      }}
                    >
                      {monthName.slice(0, 3)}
                    </button>
                  );
                })}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 6,
                  borderTop: "1px solid var(--border-color, #e5e7eb)",
                  paddingTop: 10,
                }}
              >
                {(
                  [
                    {
                      label: "Bu Ay",
                      action: () => selectMonthYear(new Date().getMonth(), new Date().getFullYear()),
                    },
                    {
                      label: "Geçen Ay",
                      action: () => {
                        const d = new Date();
                        d.setMonth(d.getMonth() - 1);
                        selectMonthYear(d.getMonth(), d.getFullYear());
                      },
                    },
                    {
                      label: "Bu Yıl Başı",
                      action: () => {
                        const d = new Date();
                        d.setMonth(0);
                        selectMonthYear(0, d.getFullYear());
                      },
                    },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={s.action}
                    style={{
                      flex: 1,
                      padding: "6px 4px",
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 600,
                      background: "var(--bg-secondary, #f3f4f6)",
                      color: "var(--text-secondary, #6b7280)",
                      border: "none",
                      cursor: "pointer",
                      transition: "all 150ms",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="mcal-wrap relative mb-4 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mcal-header flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700">
        <button
          type="button"
          onClick={() => onMonthChange(-1)}
          className="mcal-nav flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-lg text-gray-900 dark:bg-gray-700 dark:text-white"
          aria-label="Önceki ay"
        >
          ‹
        </button>

        <button
          ref={monthBtnRef}
          type="button"
          onClick={openPicker}
          className="mcal-month-btn"
        >
          {currentMonth.toLocaleDateString("tr-TR", { month: "long", year: "numeric" })}
          <span className="mcal-picker-arrow">{showPicker ? "▲" : "▼"}</span>
        </button>

        <button
          type="button"
          onClick={() => onMonthChange(1)}
          className="mcal-nav flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-lg text-gray-900 dark:bg-gray-700 dark:text-white"
          aria-label="Sonraki ay"
        >
          ›
        </button>
      </div>

      {pickerPortal}

      <div
        className="mcal-days flex gap-1 overflow-x-auto px-3 py-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        ref={scrollRef}
      >
        {days.map((day) => (
          <button
            key={day.key}
            type="button"
            onClick={() => onSelect(day.isSelected ? null : day.key)}
            className={cn(
              "mcal-day flex min-w-[44px] shrink-0 flex-col items-center gap-0.5 rounded-xl border-none bg-transparent px-1.5 py-2 transition-all",
              "text-inherit hover:bg-gray-100 dark:hover:bg-gray-700/80",
              day.isToday && "font-extrabold text-green-700 dark:text-green-400",
              day.isSelected &&
                "bg-green-700 text-white hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-600",
              day.isSelected && day.isToday && "text-white"
            )}
          >
            <span
              className={cn(
                "text-[10px] font-medium capitalize",
                day.isSelected ? "text-white/90" : "text-gray-500 dark:text-gray-400"
              )}
            >
              {day.dayName}
            </span>
            <span
              className={cn(
                "text-base font-bold",
                day.isSelected ? "text-white" : "text-gray-900 dark:text-white"
              )}
            >
              {day.num}
            </span>
            <div className="flex h-1.5 items-center justify-center gap-0.5">
              {day.income > 0 ? (
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full bg-green-700",
                    day.isSelected && "bg-white/90 dark:bg-white/90"
                  )}
                />
              ) : null}
              {day.expense > 0 ? (
                <span className={cn("h-1.5 w-1.5 rounded-full bg-red-600", day.isSelected && "bg-red-200")} />
              ) : null}
            </div>
          </button>
        ))}
      </div>

      {selectedDate && summary ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 bg-gray-50 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-900/40">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {new Date(selectedDate + "T12:00:00").toLocaleDateString("tr-TR", {
              day: "numeric",
              month: "long",
            })}
          </span>
          <div className="flex flex-wrap items-center gap-2.5">
            {summary.income > 0 ? (
              <span className="text-sm font-bold text-green-700 dark:text-green-400">
                +₺{summary.income.toLocaleString("tr-TR")}
              </span>
            ) : null}
            {summary.expense > 0 ? (
              <span className="text-sm font-bold text-red-600 dark:text-red-400">
                −₺{summary.expense.toLocaleString("tr-TR")}
              </span>
            ) : null}
            <span className="text-xs text-gray-500 dark:text-gray-400">{summary.count} işlem</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
