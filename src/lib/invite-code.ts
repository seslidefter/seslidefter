import { createClient } from "@/lib/supabase/client";

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
 * Profilde kayıtlı davet kodunu döner; yoksa benzersiz kod üretip yazar (çakışmada tekrar dener).
 */
export async function getOrCreateInviteCode(userId: string): Promise<string> {
  const supabase = createClient();

  const { data: row, error: selErr } = await supabase
    .from("profiles")
    .select("invite_code")
    .eq("id", userId)
    .maybeSingle();

  if (selErr) console.error("[invite-code] select", selErr);

  const existing = row?.invite_code?.trim();
  if (existing) return existing;

  for (let attempt = 0; attempt < 25; attempt++) {
    const code = generateCode();
    const { error: upErr } = await supabase.from("profiles").update({ invite_code: code }).eq("id", userId);
    if (!upErr) {
      const { data: again } = await supabase
        .from("profiles")
        .select("invite_code")
        .eq("id", userId)
        .maybeSingle();
      return again?.invite_code?.trim() ?? code;
    }
    if (!isUniqueViolation(upErr)) {
      console.error("[invite-code] update", upErr);
      break;
    }
  }

  return generateCode();
}
