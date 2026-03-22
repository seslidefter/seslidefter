export function sendWhatsAppReminder(
  contactPhone: string,
  contactName: string,
  amount: number,
  type: "alacak" | "verecek",
  dueDate?: string | null
) {
  const isAlacak = type === "alacak";
  const dueDateText = dueDate
    ? `, vade: ${new Date(dueDate + "T12:00:00").toLocaleDateString("tr-TR")}`
    : "";

  const message = isAlacak
    ? `Merhaba ${contactName}! 👋\n\nSizden ₺${amount.toFixed(2)} alacağım bulunmakta${dueDateText}. Ödeme konusunda bilgilendirmenizi rica ederim. 🙏\n\n— SesliDefter`
    : `Merhaba ${contactName}! 👋\n\n₺${amount.toFixed(2)} borcum olduğunu hatırlatmak istedim${dueDateText}. En kısa sürede ödeyeceğim. 🙏\n\n— SesliDefter`;

  const digits = contactPhone.replace(/\D/g, "");
  if (digits.length < 10) {
    shareDebtOnWhatsApp(contactName, amount, type);
    return;
  }
  const url = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

export function shareDebtOnWhatsApp(
  contactName: string,
  amount: number,
  type: "alacak" | "verecek"
) {
  const message =
    type === "alacak"
      ? `${contactName}'dan ₺${amount.toFixed(2)} alacağım var. SesliDefter ile takip ediyorum. 📒`
      : `${contactName}'a ₺${amount.toFixed(2)} borcum var. SesliDefter ile takip ediyorum. 📒`;

  const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}
