/** Ücretsiz, API anahtarı gerektirmeyen kural tabanlı finans asistanı yanıtları (Türkçe). */

export interface FinancialAiContext {
  kasa: number;
  gelir: number;
  gider: number;
  alacak: number;
  verecek: number;
  islemSayisi: number;
  kategoriler: Record<string, number>;
  sonIslemler: Array<{
    category: string;
    amount: number;
    description: string | null;
    date: string;
  }>;
}

function fmt(n: number) {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function generateLocalFinancialReply(message: string, ctx: FinancialAiContext): string {
  const m = message.toLowerCase().trim();
  const net = ctx.gelir - ctx.gider;
  const topGider = Object.entries(ctx.kategoriler).sort((a, b) => b[1] - a[1])[0];

  if (!m) {
    return `Merhaba! Kasa bakiyeniz ₺${fmt(ctx.kasa)}. Son 90 günde ${ctx.islemSayisi} işlem kaydınız var. Nasıl yardımcı olayım?`;
  }

  if (/merhaba|selam|hey|günaydın|iyi günler/.test(m)) {
    return `Merhaba! Özet: kasa ₺${fmt(ctx.kasa)}, gelir ₺${fmt(ctx.gelir)}, gider ₺${fmt(ctx.gider)}. Sorunuzu yazabilirsiniz.`;
  }

  if (/bakiye|kasa|ne kadar param/.test(m)) {
    return `Kasa bakiyeniz yaklaşık ₺${fmt(ctx.kasa)}. Alacaklarınız ₺${fmt(ctx.alacak)}, ödemeniz gereken (verecek) ₺${fmt(ctx.verecek)}.`;
  }

  if (/neden.*harc|çok harcad|fazla gider/.test(m)) {
    if (topGider) {
      return `Giderlerinizin önemli kısmı “${topGider[0]}” altında (₺${fmt(topGider[1])}). Bu kalemi bir süre izleyip küçük hedefler koymak işe yarar.`;
    }
    return `Henüz etiketli gider dağılımı az görünüyor. İşlemlere kategori etiketi ekledikçe daha net öneri verebilirim.`;
  }

  if (/neye harc|en çok|kategori/.test(m)) {
    if (topGider) {
      return `Şu an giderlerde öne çıkan kategori: ${topGider[0]} (₺${fmt(topGider[1])}). İkinci sırayı görmek isterseniz “dağılım” diye sorun.`;
    }
    return `Etiketli gider verisi sınırlı. Market, ulaşım gibi etiketlerle kayıt eklemenizi öneririm.`;
  }

  if (/tasarruf|tutum|azalt/.test(m)) {
    const oran = ctx.gelir > 0 ? ((net / ctx.gelir) * 100).toFixed(0) : "0";
    return `Gelir−gider farkınız ₺${fmt(net)} (gelire oranı ~%${oran}). Sabit giderleri ve “istek” harcamalarını ayırıp haftalık küçük limit koymak iyi başlangıç olur.`;
  }

  if (/alacak/.test(m)) {
    return `Toplam alacak kayıtlarınız ₺${fmt(ctx.alacak)}. Vadesi geçenleri kişi bazında hatırlatmak için Alacak/Verecek ekranını kullanabilirsiniz.`;
  }

  if (/borç|verecek|ödemem/.test(m)) {
    return `Verecek (borç) toplamınız ₺${fmt(ctx.verecek)}. Önceliklendirmek için tutar ve vadeye göre sıralayıp küçük ödemelerle başlamak psikolojik olarak rahatlatır.`;
  }

  if (/geçen ay|önceki ay|karşılaştır/.test(m)) {
    return `Bu yanıt son 90 günlük özetten geliyor; ay ay kırılım için Rapor sayfasındaki dönem seçimlerine bakın. Şu an net nakit akışı yaklaşık ₺${fmt(net)}.`;
  }

  if (/son işlem|ne ekledim/.test(m)) {
    const slice = ctx.sonIslemler.slice(0, 3);
    if (slice.length === 0) return "Henüz kayıtlı işlem yok; ses veya işlem formuyla ekleyebilirsiniz.";
    const lines = slice.map(
      (t) => `• ${t.date}: ${t.category} ₺${fmt(t.amount)} ${t.description ?? ""}`.trim()
    );
    return `Son işlemlerden örnekler:\n${lines.join("\n")}`;
  }

  return `Özet: Kasa ₺${fmt(ctx.kasa)}, gelir ₺${fmt(ctx.gelir)}, gider ₺${fmt(ctx.gider)}, alacak ₺${fmt(ctx.alacak)}, verecek ₺${fmt(ctx.verecek)}. “Bakiye”, “tasarruf”, “neye harcıyorum” gibi sorular sorabilirsiniz — tamamen sizin verilerinizle yanıtlıyorum, ücretli yapay zeka kullanılmıyor.`;
}
