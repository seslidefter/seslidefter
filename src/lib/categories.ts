export interface CategoryTag {
  id: string;
  label: string;
  icon: string;
  color: string;
  keywords: string[];
  type: "gelir" | "gider" | "all";
}

export const EXPENSE_CATEGORIES: CategoryTag[] = [
  {
    id: "gida",
    label: "Gıda",
    icon: "🛒",
    color: "#E53935",
    keywords: [
      "gıda",
      "market",
      "bakkal",
      "migros",
      "bim",
      "a101",
      "şok",
      "carrefour",
      "yemek",
      "ekmek",
      "süt",
      "meyve",
      "sebze",
    ],
    type: "gider",
  },
  {
    id: "yemek",
    label: "Yeme İçme",
    icon: "🍽️",
    color: "#FB8C00",
    keywords: [
      "restoran",
      "kafe",
      "kahve",
      "burger",
      "pizza",
      "döner",
      "lokanta",
      "starbucks",
      "yemek sipariş",
    ],
    type: "gider",
  },
  {
    id: "ulasim",
    label: "Ulaşım",
    icon: "🚗",
    color: "#1E88E5",
    keywords: [
      "benzin",
      "akaryakıt",
      "otobüs",
      "metro",
      "taksi",
      "uber",
      "dolmuş",
      "ulaşım",
      "yakıt",
      "otoyol",
      "köprü",
    ],
    type: "gider",
  },
  {
    id: "kira",
    label: "Kira",
    icon: "🏠",
    color: "#8E24AA",
    keywords: ["kira", "kiracı", "ev kirası", "işyeri kirası"],
    type: "gider",
  },
  {
    id: "fatura",
    label: "Fatura",
    icon: "⚡",
    color: "#FFB300",
    keywords: ["fatura", "elektrik", "su", "doğalgaz", "internet", "telefon", "aidat", "abonelik"],
    type: "gider",
  },
  {
    id: "saglik",
    label: "Sağlık",
    icon: "💊",
    color: "#E91E63",
    keywords: ["ilaç", "eczane", "doktor", "hastane", "muayene", "sağlık", "diş", "göz"],
    type: "gider",
  },
  {
    id: "egitim",
    label: "Eğitim",
    icon: "📚",
    color: "#3949AB",
    keywords: ["okul", "kurs", "kitap", "eğitim", "öğrenci", "üniversite", "dershane"],
    type: "gider",
  },
  {
    id: "giyim",
    label: "Giyim",
    icon: "👕",
    color: "#00897B",
    keywords: ["kıyafet", "giyim", "ayakkabı", "çanta", "aksesuar", "moda"],
    type: "gider",
  },
  {
    id: "eglence",
    label: "Eğlence",
    icon: "🎮",
    color: "#7B1FA2",
    keywords: ["sinema", "tiyatro", "konser", "eğlence", "oyun", "netflix", "spotify", "tatil", "gezi"],
    type: "gider",
  },
  {
    id: "diger_gider",
    label: "Diğer",
    icon: "💸",
    color: "#546E7A",
    keywords: [],
    type: "gider",
  },
];

export const INCOME_CATEGORIES: CategoryTag[] = [
  {
    id: "maas",
    label: "Maaş",
    icon: "💼",
    color: "#2E7D32",
    keywords: ["maaş", "ücret", "maaşım", "aylık", "bordro"],
    type: "gelir",
  },
  {
    id: "serbest",
    label: "Serbest Gelir",
    icon: "💻",
    color: "#388E3C",
    keywords: ["freelance", "proje", "iş", "hizmet", "danışmanlık"],
    type: "gelir",
  },
  {
    id: "kira_gelir",
    label: "Kira Geliri",
    icon: "🏘️",
    color: "#43A047",
    keywords: ["kira geliri", "kira aldım", "kiracıdan"],
    type: "gelir",
  },
  {
    id: "satis",
    label: "Satış",
    icon: "🛍️",
    color: "#4CAF50",
    keywords: ["sattım", "satış", "mal sattım"],
    type: "gelir",
  },
  {
    id: "diger_gelir",
    label: "Diğer Gelir",
    icon: "💰",
    color: "#66BB6A",
    keywords: [],
    type: "gelir",
  },
];

export const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

export function detectCategory(text: string, txCategory: string): string {
  const lower = text.toLowerCase();
  const categories = txCategory === "gelir" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  for (const cat of categories) {
    if (cat.keywords.some((kw) => lower.includes(kw))) {
      return cat.id;
    }
  }

  return txCategory === "gelir" ? "diger_gelir" : "diger_gider";
}

export function getCategoryById(id: string): CategoryTag | undefined {
  return ALL_CATEGORIES.find((c) => c.id === id);
}
