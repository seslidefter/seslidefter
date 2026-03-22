import { parseTryAmount } from "@/lib/utils";

/** XSS riskini azaltmak için metin alanları — max uzunluk opsiyonel */
export function sanitizeInput(input: string, maxLen = 1000): string {
  return input
    .trim()
    .replace(/[<>]/g, "")
    .slice(0, maxLen);
}

/** Form / metin tutarı → sayı (TRY girişleri için) */
export function sanitizeAmount(input: string): number {
  const cleaned = input.replace(/[^\d.,-]/g, "");
  const num = parseTryAmount(cleaned);
  if (!Number.isFinite(num) || num < 0 || num > 9999999) return 0;
  return Math.round(num * 100) / 100;
}

export function clampAmountNum(n: number): number {
  if (!Number.isFinite(n) || n < 0 || n > 9999999) return 0;
  return Math.round(n * 100) / 100;
}

export function sanitizeDate(input: string): string {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(input)) return new Date().toISOString().split("T")[0];

  const date = new Date(input + "T12:00:00");
  if (Number.isNaN(date.getTime())) return new Date().toISOString().split("T")[0];

  const minDate = new Date("2000-01-01");
  const maxDate = new Date("2100-01-01");
  if (date < minDate || date > maxDate) return new Date().toISOString().split("T")[0];

  return input;
}

export function sanitizeOptionalDate(input: string | null | undefined): string | null {
  const t = (input ?? "").trim();
  if (!t) return null;
  return sanitizeDate(t);
}
