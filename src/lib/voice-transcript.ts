import { detectCategory, getCategoryById } from "@/lib/categories";
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

/** Geliştirilmiş ses / metin analizi — önce kategori (gelir öncelikli), sonra tutar */
export function analyzeVoiceTranscript(text: string): VoiceAnalysisResult {
  const raw = text.trim();
  if (!raw) {
    return { amount: null, category: null, tag: null, contactName: null };
  }

  const lower = raw.toLowerCase();

  let category: TransactionCategory | null = null;

  if (
    /\bgelir\b/.test(lower) ||
    /gelir ekle/.test(lower) ||
    /kazandım/.test(lower) ||
    /maaş/.test(lower) ||
    /tahsilat/.test(lower) ||
    /sattım/.test(lower) ||
    /\bgeldi\b/.test(lower) ||
    /para geldi/.test(lower) ||
    /aldım para/.test(lower) ||
    /tahsil ettim/.test(lower)
  ) {
    category = "gelir";
  } else if (
    /\bgider\b/.test(lower) ||
    /gider ekle/.test(lower) ||
    /harcadım/.test(lower) ||
    /ödedim/.test(lower) ||
    /\baldım\b/.test(lower) ||
    /masraf/.test(lower) ||
    /fatura/.test(lower) ||
    /market/.test(lower) ||
    /düştü/.test(lower)
  ) {
    category = "gider";
  } else if (
    /\balacak\b/.test(lower) ||
    /alacağım/.test(lower) ||
    /\bborçlu\b/.test(lower) ||
    /verecek bana/.test(lower) ||
    /ödeyecek bana/.test(lower)
  ) {
    category = "alacak";
  } else if (
    /\bverecek\b/.test(lower) ||
    /vereceğim/.test(lower) ||
    /borçluyum/.test(lower) ||
    /ödeyeceğim/.test(lower) ||
    /ödemem lazım/.test(lower)
  ) {
    category = "verecek";
  }

  let amount: number | null = null;

  const numericMatch = raw.match(
    /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+)\s*(?:tl|lira|₺)/i
  );
  if (numericMatch?.[1]) {
    const n = parseTryAmount(numericMatch[1].replace(/\./g, "").replace(",", "."));
    if (Number.isFinite(n) && n > 0) amount = n;
  }

  if (amount == null) {
    const plainMatch = raw.match(/\b(\d{2,})\b/);
    if (plainMatch?.[1]) {
      const n = parseFloat(plainMatch[1]);
      if (Number.isFinite(n) && n > 0) amount = n;
    }
  }

  if (amount == null) {
    let binMatch: RegExpMatchArray | null = null;
    const bm = lower.match(/(\w+)\s*bin\b/);
    if (bm) binMatch = bm;
    if (binMatch?.[1]) {
      const mult = WORD_TO_NUM[binMatch[1]] ?? parseInt(binMatch[1], 10);
      if (!Number.isNaN(mult) && mult > 0) amount = mult * 1000;
    }
    const ym = lower.match(/(\w+)\s*yüz\b/);
    if (ym && !binMatch?.[1]) {
      const mult = WORD_TO_NUM[ym[1]!] ?? parseInt(ym[1]!, 10);
      if (!Number.isNaN(mult) && mult > 0) amount = mult * 100;
    }
  }

  let tag: string | null = null;
  if (/market|migros|bim|a101|şok|carrefour|bakkal/.test(lower)) tag = "Market";
  else if (/\bkira\b/.test(lower)) tag = "Kira";
  else if (/fatura|elektrik|su|doğalgaz|internet/.test(lower)) tag = "Fatura";
  else if (/benzin|akaryakıt|taksi|otobüs|metro/.test(lower)) tag = "Ulaşım";
  else if (/yemek|restoran|kafe|kahve/.test(lower)) tag = "Yemek";
  else if (/maaş|ücret/.test(lower)) tag = "Maaş";

  if (category === "gelir" || category === "gider") {
    const tagId = detectCategory(raw, category);
    if (tagId !== "diger_gelir" && tagId !== "diger_gider") {
      const det = getCategoryById(tagId);
      if (det) tag = det.label;
    }
  }

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
    "milyon",
    "gelir",
    "gider",
    "alacak",
    "verecek",
    "ekle",
    "ekleyin",
    "aldım",
    "ödedim",
    "verdim",
    "para",
    "borç",
    "bana",
    "benim",
    "bugün",
    "yarın",
    "market",
    "kira",
    "fatura",
    "maaş",
    "ücret",
    "gelen",
    "giden",
    "alacağım",
    "vereceğim",
    "onun",
    "ondan",
    "sana",
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

  console.log("🎙️ Ses analizi:", { text: raw, amount, category, tag, contactName });

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
