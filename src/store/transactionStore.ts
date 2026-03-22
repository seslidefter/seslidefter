import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import { checkMonthlyTransactionLimit } from "@/lib/plan-limits";
import { calculateNextBalanceAfterTransaction } from "@/lib/transaction-balance";
import type {
  ContactRow,
  RecurringOption,
  TransactionCategory,
  TransactionRow,
} from "@/types/database";

export interface AddTransactionPayload {
  contact_id?: string | null;
  category: TransactionCategory;
  amount: number;
  description?: string | null;
  transcript?: string | null;
  audio_url?: string | null;
  date?: string;
  category_tag?: string | null;
  due_date?: string | null;
  is_paid?: boolean;
  recurring?: RecurringOption | string | null;
  recurring_end?: string | null;
}

interface TransactionState {
  transactions: TransactionRow[];
  contacts: ContactRow[];
  loading: boolean;
  fetchAll: () => Promise<{ error: string | null }>;
  addTransaction: (payload: AddTransactionPayload) => Promise<{ error: string | null }>;
  updateTransaction: (
    id: string,
    payload: AddTransactionPayload
  ) => Promise<{ error: string | null }>;
  deleteTransaction: (id: string) => Promise<{ error: string | null }>;
  markTransactionPaid: (id: string) => Promise<{ error: string | null }>;
  addContact: (payload: {
    name: string;
    phone?: string | null;
    note?: string | null;
  }) => Promise<{ error: string | null; data: ContactRow | null }>;
}

/** Kasa bakiyesi: anchor anından itibaren (created_at, id) sırasıyla yeniden hesapla */
async function recalculateBalancesFrom(
  userId: string,
  fromCreatedAt?: string | null
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const anchor = fromCreatedAt ?? "1970-01-01T00:00:00.000Z";

  const { data: prevRow, error: prevErr } = await supabase
    .from("transactions")
    .select("balance_after")
    .eq("user_id", userId)
    .lt("created_at", anchor)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (prevErr) {
    console.error("[recalculateBalancesFrom] prev", prevErr);
    return { error: prevErr.message };
  }

  let balance = prevRow?.balance_after != null ? Number(prevRow.balance_after) : 0;

  const { data: txs, error: fetchErr } = await supabase
    .from("transactions")
    .select("id, category, amount, created_at")
    .eq("user_id", userId)
    .gte("created_at", anchor)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (fetchErr) {
    console.error("[recalculateBalancesFrom] fetch", fetchErr);
    return { error: fetchErr.message };
  }

  for (const tx of txs ?? []) {
    if (tx.category === "gelir") balance += Number(tx.amount);
    else if (tx.category === "gider") balance -= Number(tx.amount);

    const { error: upErr } = await supabase
      .from("transactions")
      .update({ balance_after: balance })
      .eq("id", tx.id);

    if (upErr) {
      console.error("[recalculateBalancesFrom] update", upErr);
      return { error: upErr.message };
    }
  }

  return { error: null };
}

function mapTransactionRow(
  t: Record<string, unknown>,
  contactMap: Map<string, { name: string; phone: string | null }>
): TransactionRow {
  const recurring = (t.recurring as string | null) ?? "none";
  return {
    id: t.id as string,
    user_id: t.user_id as string,
    contact_id: (t.contact_id as string | null) ?? null,
    category: t.category as TransactionCategory,
    amount: Number(t.amount),
    description: (t.description as string | null) ?? null,
    audio_url: (t.audio_url as string | null) ?? null,
    transcript: (t.transcript as string | null) ?? null,
    date: t.date as string,
    created_at: t.created_at as string,
    balance_after: t.balance_after != null ? Number(t.balance_after) : null,
    category_tag: (t.category_tag as string | null) ?? null,
    due_date: (t.due_date as string | null) ?? null,
    is_paid: t.is_paid !== false,
    recurring: (recurring as RecurringOption) || "none",
    recurring_end: (t.recurring_end as string | null) ?? null,
    contacts: t.contact_id
      ? (() => {
          const c = contactMap.get(t.contact_id as string);
          return c
            ? { name: c.name, phone: c.phone }
            : { name: "Kişi", phone: null };
        })()
      : null,
  };
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  contacts: [],
  loading: false,

  fetchAll: async () => {
    const supabase = createClient();
    set({ loading: true });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      set({ loading: false, transactions: [], contacts: [] });
      return { error: "Oturum yok" };
    }

    const [txRes, cRes] = await Promise.all([
      supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("contacts")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true }),
    ]);

    if (txRes.error) {
      console.error("[fetchAll] transactions", txRes.error);
      set({ loading: false });
      return { error: txRes.error.message };
    }
    if (cRes.error) {
      console.error("[fetchAll] contacts", cRes.error);
      set({ loading: false });
      return { error: cRes.error.message };
    }

    const contactMap = new Map<string, { name: string; phone: string | null }>(
      (cRes.data ?? []).map((c: ContactRow) => [c.id, { name: c.name, phone: c.phone ?? null }])
    );
    const merged: TransactionRow[] = (txRes.data ?? []).map((t: Record<string, unknown>) =>
      mapTransactionRow(t, contactMap)
    );

    set({
      transactions: merged,
      contacts: (cRes.data ?? []) as ContactRow[],
      loading: false,
    });
    return { error: null };
  },

  addTransaction: async (payload) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Oturum yok" };

    const limit = await checkMonthlyTransactionLimit(supabase, user.id);
    if (!limit.ok && limit.message) return { error: limit.message };

    const { value: balance_after, error: balErr } = await calculateNextBalanceAfterTransaction(
      supabase,
      user.id,
      payload.amount,
      payload.category
    );
    if (balErr) return { error: balErr };

    const row: Record<string, unknown> = {
      user_id: user.id,
      contact_id: payload.contact_id ?? null,
      category: payload.category,
      amount: payload.amount,
      description: payload.description ?? null,
      date: payload.date ?? new Date().toISOString().slice(0, 10),
      balance_after,
      category_tag: payload.category_tag?.trim() || null,
      is_paid: payload.is_paid !== false,
    };

    const dd = payload.due_date?.trim();
    if (dd) row.due_date = dd;
    const tr = payload.transcript?.trim();
    if (tr) row.transcript = tr;
    const au = payload.audio_url?.trim();
    if (au) row.audio_url = au;

    const { error } = await supabase.from("transactions").insert(row);

    if (error) {
      console.error("[addTransaction]", error);
      return { error: error.message };
    }

    await get().fetchAll();
    return { error: null };
  },

  updateTransaction: async (id, payload) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Oturum yok" };

    const { data: existing, error: exErr } = await supabase
      .from("transactions")
      .select("created_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (exErr || !existing) {
      console.error("[updateTransaction] fetch", exErr);
      return { error: exErr?.message ?? "Kayıt yok" };
    }

    const { error } = await supabase
      .from("transactions")
      .update({
        contact_id: payload.contact_id ?? null,
        category: payload.category,
        amount: payload.amount,
        description: payload.description ?? null,
        transcript: payload.transcript ?? null,
        audio_url: payload.audio_url ?? null,
        date: payload.date ?? new Date().toISOString().slice(0, 10),
        category_tag: payload.category_tag?.trim() || null,
        due_date: payload.due_date?.trim() || null,
        is_paid: payload.is_paid !== false,
        recurring: payload.recurring && payload.recurring !== "" ? payload.recurring : "none",
        recurring_end: payload.recurring_end?.trim() || null,
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("[updateTransaction]", error);
      return { error: error.message };
    }

    const rec = await recalculateBalancesFrom(user.id, existing.created_at as string);
    if (rec.error) return { error: rec.error };

    await get().fetchAll();
    return { error: null };
  },

  deleteTransaction: async (id) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: "Oturum yok" };

    const { error } = await supabase.from("transactions").delete().eq("id", id).eq("user_id", user.id);
    if (error) {
      console.error("[deleteTransaction]", error);
      return { error: error.message };
    }

    if (user) {
      const bal = await recalculateBalancesFrom(user.id, null);
      if (bal.error) return { error: bal.error };
    }

    await get().fetchAll();
    return { error: null };
  },

  markTransactionPaid: async (id) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: "Oturum yok" };

    const { error } = await supabase
      .from("transactions")
      .update({ is_paid: true })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      console.error("[markTransactionPaid]", error);
      return { error: error.message };
    }

    let recalcError: string | null = null;
    if (user) {
      const bal = await recalculateBalancesFrom(user.id, null);
      if (bal.error) {
        console.error("[markTransactionPaid] recalc", bal.error);
        recalcError = bal.error;
      }
    }

    await get().fetchAll();
    return { error: recalcError };
  },

  addContact: async (payload) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Oturum yok", data: null };

    const { data, error } = await supabase
      .from("contacts")
      .insert({
        user_id: user.id,
        name: payload.name,
        phone: payload.phone ?? null,
        note: payload.note ?? null,
      })
      .select("*")
      .single();

    if (error) {
      console.error("[addContact]", error);
      return { error: error.message, data: null };
    }
    await get().fetchAll();
    return { error: null, data: data as ContactRow };
  },
}));
