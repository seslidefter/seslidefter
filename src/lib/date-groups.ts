import type { TransactionRow } from "@/types/database";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

export function transactionDateGroup(row: TransactionRow): string {
  const d = new Date(row.date + "T12:00:00");
  const t = startOfDay(d);
  const now = new Date();
  const today = startOfDay(now);
  const yesterday = today - 86400000;

  if (t === today) return "Bugün";
  if (t === yesterday) return "Dün";

  const weekAgo = today - 7 * 86400000;
  if (t >= weekAgo) return "Bu hafta";

  const monthAgo = today - 30 * 86400000;
  if (t >= monthAgo) return "Bu ay";

  return "Daha eski";
}

export function groupTransactionsByLabel(transactions: TransactionRow[]) {
  const order = ["Bugün", "Dün", "Bu hafta", "Bu ay", "Daha eski"];
  const map = new Map<string, TransactionRow[]>();
  for (const tx of transactions) {
    const g = transactionDateGroup(tx);
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(tx);
  }
  return order.filter((k) => map.has(k)).map((k) => ({ label: k, items: map.get(k)! }));
}
