import { createClient } from "@/lib/supabase/client";
import type { TransactionCategory } from "@/types/database";

type SB = ReturnType<typeof createClient>;

/** Son işleme göre kasa bakiyesi; yeni satır için balance_after hesaplar */
export async function calculateNextBalanceAfterTransaction(
  supabase: SB,
  userId: string,
  amount: number,
  category: TransactionCategory
): Promise<{ value: number; error: string | null }> {
  const { data, error } = await supabase
    .from("transactions")
    .select("balance_after")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[calculateNextBalanceAfterTransaction]", error);
    return { value: 0, error: error.message };
  }

  const currentBalance = data?.balance_after != null ? Number(data.balance_after) : 0;

  if (category === "gelir") return { value: currentBalance + amount, error: null };
  if (category === "gider") return { value: currentBalance - amount, error: null };
  return { value: currentBalance, error: null };
}
