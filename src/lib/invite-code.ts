import { getSupabaseClient } from "@/lib/supabase/client";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  return Array.from({ length: 8 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]!).join("");
}

function isUniqueViolation(err: { code?: string; message?: string } | null | undefined): boolean {
  return (
    err?.code === "23505" ||
    String(err?.message ?? "")
      .toLowerCase()
      .includes("duplicate")
  );
}

/**
 * Profilde kayıtlı davet kodunu döner; yoksa bir kez üretip yazar.
 * Mevcut kod varsa asla yeniden üretilmez.
 */
export async function getOrCreateInviteCode(userId: string): Promise<string> {
  const supabase = getSupabaseClient();

  const { data, error: selErr } = await supabase
    .from("profiles")
    .select("invite_code")
    .eq("id", userId)
    .maybeSingle();

  if (selErr) console.error("[invite-code] select", selErr);

  const existing = data?.invite_code?.trim();
  if (existing) return existing;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const { error: upErr } = await supabase.from("profiles").update({ invite_code: code }).eq("id", userId);
    if (!upErr) return code;
    if (!isUniqueViolation(upErr)) {
      console.error("[invite-code] update", upErr);
      break;
    }
  }

  return userId.slice(0, 8).toUpperCase();
}
