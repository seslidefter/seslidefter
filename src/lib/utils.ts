import type { TransactionCategory } from "@/types/database";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/** TR: 1.234,56 veya 1234,5 veya 1234.5 */
export function parseTryAmount(raw: string): number {
  const s = raw.trim().replace(/\s/g, "");
  if (!s) return NaN;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  let normalized = s;
  if (hasComma && hasDot) {
    normalized = s.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    normalized = s.replace(",", ".");
  }
  return parseFloat(normalized);
}

export function formatTry(n: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatDateTr(
  d: string | Date,
  opts: Intl.DateTimeFormatOptions = { dateStyle: "long" }
) {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("tr-TR", opts).format(date);
}

export function formatShortDate(d: string | Date) {
  return formatDateTr(d, { day: "numeric", month: "short", year: "numeric" });
}

export function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

export interface AnalyzedVoiceForm {
  amount: number | null;
  category: TransactionCategory | null;
  contactName: string | null;
  description: string;
}

export function analyzeTranscript(text: string): AnalyzedVoiceForm {
  const trimmed = text.replace(/\s+/g, " ").trim();
  const lower = trimmed.toLowerCase();

  const amountMatch = trimmed.match(/(\d+(?:[.,]\d+)?)\s*(?:lira|tl|₺)?/i);
  const amountRaw = amountMatch ? amountMatch[1].replace(/\./g, "").replace(",", ".") : null;
  const amount = amountRaw != null ? parseFloat(amountRaw) : null;

  let category: TransactionCategory | null = null;
  if (/alacak|alacağım|borçlu|ödeyecek|verecek bana/.test(lower)) category = "alacak";
  else if (/verecek|vereceğim|borçluyum|ödeyeceğim|ödemem/.test(lower)) category = "verecek";
  else if (/gelir|kazandım|aldım|tahsil/.test(lower)) category = "gelir";
  else if (/gider|harcadım|ödedim|masraf/.test(lower)) category = "gider";

  const words = trimmed.split(/\s+/);
  const names = words.filter(
    (w) => w.length > 2 && /^[A-ZÇĞİÖŞÜ]/.test(w) && !/lira|tl|₺/i.test(w)
  );
  const contactName = names[0] ?? null;

  return {
    amount: amount != null && !Number.isNaN(amount) ? amount : null,
    category,
    contactName,
    description: trimmed,
  };
}

export function categoryLabel(c: TransactionCategory): string {
  const m: Record<TransactionCategory, string> = {
    gelir: "Gelir",
    gider: "Gider",
    alacak: "Alacak",
    verecek: "Verecek",
  };
  return m[c];
}
