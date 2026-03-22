import { parseTryAmount } from "@/lib/utils";
import type { TransactionCategory } from "@/types/database";

export interface VoiceAnalysisResult {
  amount: number | null;
  category: TransactionCategory | null;
  tag: string | null;
  contactName: string | null;
}

const WORD_TO_NUM: Record<string, number> = {
  bir: 1,
  iki: 2,
  üç: 3,
  dort: 4,
  dört: 4,
  beş: 5,
  alti: 6,
  altı: 6,
  yedi: 7,
  sekiz: 8,
  dokuz: 9,
  on: 10,
  yirmi: 20,
  otuz: 30,
  kırk: 40,
  elli: 50,
  altmis: 60,
  altmış: 60,
  yetmis: 70,
  yetmiş: 70,
  seksen: 80,
  doksan: 90,
  yuz: 100,
  yüz: 100,
  bin: 1000,
  milyon: 1_000_000,
};

/** Geliştirilmiş ses / metin analizi */
export function analyzeVoiceTranscript(text: string): VoiceAnalysisResult {
  const raw = text.trim();
  if (!raw) {
    return { amount: null, category: null, tag: null, contactName: null };
  }

  const lower = raw.toLowerCase();

  const formattedAmounts = [...raw.matchAll(/(\d{1,3}(?:[.,]\d{3})+)/g)]
    .map((m) => parseFloat(m[1]!.replace(/[.,]/g, "")))
    .filter((n) => !Number.isNaN(n) && n > 0);

  const plainAmounts = [...raw.matchAll(/\b(\d+(?:[.,]\d+)?)\b/g)]
    .map((m) => parseFloat(m[1]!.replace(",", ".")))
    .filter((n) => !Number.isNaN(n) && n > 0);

  let wordAmount: number | null = null;
  const binMatch = lower.match(/(\w+)\s*bin\b/);
  if (binMatch) {
    const w = binMatch[1]!;
    const multiplier = WORD_TO_NUM[w] ?? parseInt(w, 10);
    if (!Number.isNaN(multiplier) && multiplier > 0) wordAmount = multiplier * 1000;
  }

  const yuzMatch = lower.match(/(\w+)\s*yüz\b/);
  if (yuzMatch && !binMatch) {
    const w = yuzMatch[1]!;
    const multiplier = WORD_TO_NUM[w] ?? parseInt(w, 10);
    if (!Number.isNaN(multiplier) && multiplier > 0) wordAmount = multiplier * 100;
  }

  const allAmounts = [
    ...formattedAmounts,
    ...plainAmounts,
    ...(wordAmount != null ? [wordAmount] : []),
  ].filter((n) => n > 0 && n < 10_000_000);

  let amount: number | null = null;
  if (allAmounts.length > 0) {
    const liraMatch = raw.match(/(\d[\d.,]*)\s*(?:lira|tl|₺)/i);
    if (liraMatch) {
      const n = parseTryAmount(liraMatch[1]!);
      amount = Number.isFinite(n) ? n : null;
    }
    if (amount == null && formattedAmounts.length > 0) {
      amount = formattedAmounts[0]!;
    } else if (amount == null && wordAmount != null) {
      amount = wordAmount;
    } else if (amount == null) {
      amount = Math.max(...allAmounts);
    }
  }

  let category: TransactionCategory | null = null;
  if (/alacak|alacağım|borçlu|verecek bana|ödeyecek bana|tahsil/.test(lower)) category = "alacak";
  else if (/verecek|vereceğim|borçluyum|ödeyeceğim|ödemem lazım/.test(lower)) category = "verecek";
  else if (/kazandım|maaş|tahsilat|sattım|geldi|aldım para/.test(lower)) category = "gelir";
  else if (/harcadım|ödedim|aldım|masraf|gider|fatura|market|düştü/.test(lower)) category = "gider";

  let tag: string | null = null;
  if (/market|migros|bim|a101|şok|carrefour|bakkal/.test(lower)) tag = "Market";
  else if (/kira/.test(lower)) tag = "Kira";
  else if (/fatura|elektrik|su|doğalgaz|internet/.test(lower)) tag = "Fatura";
  else if (/benzin|akaryakıt|taksi|otobüs|metro/.test(lower)) tag = "Ulaşım";
  else if (/yemek|restoran|kafe|kahve/.test(lower)) tag = "Yemek";
  else if (/maaş|ücret/.test(lower)) tag = "Maaş";

  const stopWords = new Set([
    "lira",
    "tl",
    "bir",
    "iki",
    "üç",
    "dört",
    "beş",
    "altı",
    "yedi",
    "sekiz",
    "dokuz",
    "on",
    "yirmi",
    "otuz",
    "kırk",
    "elli",
    "altmış",
    "yetmiş",
    "seksen",
    "doksan",
    "yüz",
    "bin",
    "aldım",
    "ödedim",
    "verdim",
    "alacak",
    "verecek",
    "gelir",
    "gider",
    "bugün",
    "yarın",
    "para",
    "borç",
    "alacağım",
    "vereceğim",
    "bana",
    "benim",
    "onun",
    "ondan",
    "sana",
    "market",
    "kira",
    "fatura",
    "maaş",
    "ücret",
    "gelen",
    "giden",
  ]);

  const words = raw.split(/\s+/);
  const contactName =
    words.find((w) => {
      if (w.length < 2) return false;
      if (!/^[A-ZÇĞİÖŞÜa-zçğışöü]/.test(w)) return false;
      const firstChar = w[0]!;
      if (firstChar !== firstChar.toLocaleUpperCase("tr-TR")) return false;
      if (stopWords.has(w.toLowerCase())) return false;
      if (/^\d/.test(w)) return false;
      return true;
    }) ?? null;

  console.log("Analiz:", { text: raw, amount, category, tag, contactName, allAmounts });

  return { amount, category, tag, contactName };
}

/** `analyzeVoiceTranscript` ile aynı (alias) */
export const analyzeTranscript = analyzeVoiceTranscript;

/** Alacak/Verecek sayfası için: "Ali'den 500 lira alacağım" vb. */
export function analyzeAlacakVerecekVoice(text: string): VoiceAnalysisResult {
  const base = analyzeVoiceTranscript(text);
  const lower = text.toLowerCase();
  let category = base.category;

  if (/alacağım|alacak|tahsil|benden alacak|ödeyecek bana|verecek bana/.test(lower)) {
    category = "alacak";
  } else if (/vereceğim|verecek|borcum|ödeyeceğim|borçluyum|borçlu/.test(lower)) {
    category = "verecek";
  }

  let contactName = base.contactName;
  if (!contactName) {
    const m1 = text.match(/([A-Za-zÇĞİÖŞÜçğıöşü]+(?:\s+[A-Za-zÇĞİÖŞÜçğıöşü]+)?)'[dt][aeıu]n\b/i);
    if (m1?.[1]) contactName = m1[1].trim();
  }
  if (!contactName) {
    const m2 = text.match(/([A-Za-zÇĞİÖŞÜçğıöşü]+(?:\s+[A-Za-zÇĞİÖŞÜçğıöşü]+)?)'[eaıu]\b/i);
    if (m2?.[1] && /verecek|vereceğim|borç/.test(lower)) contactName = m2[1].trim();
  }

  return { ...base, category, contactName };
}
