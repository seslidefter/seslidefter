import { generateLocalFinancialReply } from "@/lib/financial-ai-local";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message : "";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("category, amount, description, category_tag, date, balance_after, created_at")
    .eq("user_id", user.id)
    .gte("date", sinceStr)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[api/ai]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  const rows = transactions ?? [];
  const num = (x: unknown) => Number(x) || 0;

  const toplamGelir = rows.filter((t) => t.category === "gelir").reduce((s, t) => s + num(t.amount), 0);
  const toplamGider = rows.filter((t) => t.category === "gider").reduce((s, t) => s + num(t.amount), 0);
  const toplamAlacak = rows.filter((t) => t.category === "alacak").reduce((s, t) => s + num(t.amount), 0);
  const toplamVerecek = rows.filter((t) => t.category === "verecek").reduce((s, t) => s + num(t.amount), 0);

  const kasaBakiyesi =
    rows[0]?.balance_after != null && !Number.isNaN(Number(rows[0].balance_after))
      ? Number(rows[0].balance_after)
      : toplamGelir - toplamGider;

  const kategoriler: Record<string, number> = {};
  for (const t of rows) {
    if (t.category !== "gider") continue;
    const tag = (t.category_tag as string)?.trim() || "Diğer";
    kategoriler[tag] = (kategoriler[tag] || 0) + num(t.amount);
  }

  const sonIslemler = rows.slice(0, 10).map((t) => ({
    category: String(t.category),
    amount: num(t.amount),
    description: (t.description as string | null) ?? null,
    date: String(t.date),
  }));

  const reply = generateLocalFinancialReply(message, {
    kasa: kasaBakiyesi,
    gelir: toplamGelir,
    gider: toplamGider,
    alacak: toplamAlacak,
    verecek: toplamVerecek,
    islemSayisi: rows.length,
    kategoriler,
    sonIslemler,
  });

  return Response.json({ reply });
}
