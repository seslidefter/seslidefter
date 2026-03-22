"use client";

import { useRef, type ChangeEvent, type FocusEvent } from "react";
import { cn, parseTryAmount } from "@/lib/utils";

/** Görünen TR metninden kanonik ham: ondalık ayırıcı `.`, binlik yok */
export function normalizeAmountTyping(display: string): string {
  let x = display.replace(/[^\d.,-]/g, "");
  const neg = x.startsWith("-");
  if (neg) x = x.slice(1);

  const c = x.lastIndexOf(",");
  if (c >= 0) {
    const intRaw = x.slice(0, c).replace(/\./g, "").replace(/,/g, "");
    const decRaw = x.slice(c + 1).replace(/\D/g, "").slice(0, 2);
    if (decRaw) return (neg ? "-" : "") + `${intRaw || "0"}.${decRaw}`;
    return (neg ? "-" : "") + (intRaw || "");
  }

  const d = x.lastIndexOf(".");
  if (d >= 0) {
    const after = x.slice(d + 1);
    if (/^\d{0,2}$/.test(after) && x.indexOf(".") === d) {
      const intRaw = x.slice(0, d).replace(/\./g, "").replace(/,/g, "");
      if (after) return (neg ? "-" : "") + `${intRaw || "0"}.${after.slice(0, 2)}`;
    }
  }

  return (neg ? "-" : "") + x.replace(/\./g, "").replace(/,/g, "");
}

export function formatAmountDisplay(normalized: string): string {
  if (!normalized) return "";
  const neg = normalized.startsWith("-");
  const body = neg ? normalized.slice(1) : normalized;
  const [a, rawDec = ""] = body.split(".");
  const intNum = parseInt(a || "0", 10);
  const intStr = Number.isFinite(intNum) ? intNum.toLocaleString("tr-TR") : "0";
  let out = (neg ? "-" : "") + intStr;
  if (body.includes(".")) {
    out += `,${rawDec.replace(/\D/g, "").slice(0, 2)}`;
  }
  return out;
}

export interface AmountInputProps {
  value: string;
  /** İkinci argüman: ekranda gösterilen TR formatı (isteğe bağlı kullanım) */
  onChange: (raw: string, formatted: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  /** default: gri border; theme: uygulama CSS değişkenleri */
  variant?: "default" | "theme";
  id?: string;
}

export function AmountInput({
  value,
  onChange,
  placeholder = "0",
  className = "",
  inputClassName = "",
  label,
  error,
  disabled,
  variant = "default",
  id,
}: AmountInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const displayValue = formatAmountDisplay(value);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const norm = normalizeAmountTyping(e.target.value);
    onChange(norm, formatAmountDisplay(norm));
  }

  function handleFocus(e: FocusEvent<HTMLInputElement>) {
    setTimeout(() => {
      const len = e.target.value.length;
      e.target.setSelectionRange(len, len);
    }, 0);
  }

  if (variant === "theme") {
    return (
      <div className={className}>
        {label ? (
          <label
            htmlFor={id}
            className="mb-1.5 block text-sm font-bold text-[var(--text-primary)]"
          >
            {label}
          </label>
        ) : null}
        <div
          className={cn(
            "flex min-h-[52px] items-stretch overflow-hidden rounded-xl border-[1.5px] border-[var(--border-color)]",
            "bg-[var(--bg-secondary)] focus-within:border-[var(--sd-primary)]",
            "focus-within:ring-2 focus-within:ring-[color-mix(in_srgb,var(--sd-primary)_25%,transparent)]",
            error && "border-[var(--sd-gider)]"
          )}
        >
          <span className="flex items-center border-r border-[var(--border-color)] bg-black/[0.03] px-3 text-sm font-bold text-black/45 dark:text-[var(--text-secondary)]">
            ₺
          </span>
          <input
            ref={inputRef}
            id={id}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            disabled={disabled}
            value={displayValue}
            onChange={handleChange}
            onFocus={handleFocus}
            placeholder={placeholder}
            className={cn(
              "min-w-0 flex-1 border-0 bg-transparent px-3 py-3 text-lg font-bold outline-none",
              "text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]",
              inputClassName
            )}
            aria-invalid={!!error}
          />
        </div>
        {error ? (
          <p className="mt-1.5 text-xs font-bold text-[var(--sd-gider)]">{error}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={className}>
      {label ? (
        <label
          htmlFor={id}
          className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400"
        >
          {label}
        </label>
      ) : null}

      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 select-none text-base font-bold text-gray-500 dark:text-gray-400">
          ₺
        </span>
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          className={cn(
            "w-full rounded-xl border-2 border-gray-200 bg-gray-50 py-3 pl-8 pr-4 text-lg font-bold text-gray-900 transition-all",
            "focus:border-green-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white",
            error && "border-red-400 focus:border-red-500",
            inputClassName
          )}
          aria-invalid={!!error}
        />
      </div>
      {error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
    </div>
  );
}

/** DB / hesaplama öncesi sayı; ham string virgül/nokta (TR) veya kanonik nokta ondalık */
export function parseAmount(value: string): number {
  const n = parseTryAmount(value.trim());
  return Number.isFinite(n) ? n : 0;
}
