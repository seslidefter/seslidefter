/** default_categories ile uyumlu (Supabase seed) */
const TAG_MAP: Record<string, { icon: string; color: string }> = {
  Maaş: { icon: "💼", color: "#2E7D32" },
  "Serbest Gelir": { icon: "💻", color: "#388E3C" },
  "Kira Geliri": { icon: "🏠", color: "#43A047" },
  "Diğer Gelir": { icon: "💰", color: "#4CAF50" },
  Market: { icon: "🛒", color: "#D32F2F" },
  Kira: { icon: "🏠", color: "#C62828" },
  Fatura: { icon: "⚡", color: "#E53935" },
  Ulaşım: { icon: "🚗", color: "#F44336" },
  Yemek: { icon: "🍽️", color: "#EF5350" },
  Sağlık: { icon: "💊", color: "#E91E63" },
  Eğitim: { icon: "📚", color: "#9C27B0" },
  Giyim: { icon: "👕", color: "#673AB7" },
  Eğlence: { icon: "🎮", color: "#3F51B5" },
  "Diğer Gider": { icon: "💸", color: "#FF5722" },
  "Ticari Alacak": { icon: "📥", color: "#1565C0" },
  "Kişisel Alacak": { icon: "🤝", color: "#1976D2" },
  "Ticari Verecek": { icon: "📤", color: "#E65100" },
  "Kişisel Verecek": { icon: "🤲", color: "#F57C00" },
};

export function tagIconFor(name: string | null | undefined): string {
  if (!name) return "📋";
  return TAG_MAP[name]?.icon ?? "📋";
}

export function tagColorFor(name: string | null | undefined): string {
  if (!name) return "#64748b";
  return TAG_MAP[name]?.color ?? "#64748b";
}
