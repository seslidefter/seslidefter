import { NextResponse } from "next/server";
import { generateLocalFinancialReply } from "@/lib/financial-ai-local";
import { createClient } from "@/lib/supabase/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || now > userLimit.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (userLimit.count >= limit) return false;

  userLimit.count++;
  return true;
}

export async function POST(req: Request) {
  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, premium_until")
    .eq("id", user.id)
    .maybeSingle();

  const isPremium =
    (profile?.premium_until != null && new Date(profile.premium_until) > new Date()) ||
    profile?.plan === "premium";

  const limit = isPremium ? 50 : 5;
  const windowMs = 24 * 60 * 60 * 1000;

  if (!checkRateLimit(user.id, limit, windowMs)) {
    return NextResponse.json(
      {
        error: isPremium
          ? "Günlük AI limiti doldu (50 sorgu)"
          : "Günlük AI limiti doldu. Premium'a geçerek 50 sorgu hakkı kazanın.",
      },
      { status: 429 }
    );
  }

  const message = typeof body.message === "string" ? body.message : "";
  if (!message.trim()) {
    return NextResponse.json({ error: "Mesaj boş olamaz" }, { status: 400 });
  }
  if (message.length > 500) {
    return NextResponse.json({ error: "Mesaj çok uzun (max 500 karakter)" }, { status: 400 });
  }

  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("category, amount, description, category_tag, date, balance_after, created_at")
    .eq("user_id", user.id)
    .gte("date", sinceStr)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[api/ai]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
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

  return NextResponse.json({ reply });
}
