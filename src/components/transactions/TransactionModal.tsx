"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { AmountInput, parseAmount } from "@/components/ui/AmountInput";
import { Button } from "@/components/ui/Button";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { FREE_LIMITS } from "@/lib/plan-limits";
import { createClient } from "@/lib/supabase/client";
import { calculateNextBalanceAfterTransaction } from "@/lib/transaction-balance";
import { cn, todayISODate } from "@/lib/utils";
import type { ContactRow, DefaultCategoryRow, TransactionCategory } from "@/types/database";
import { useTransactionStore } from "@/store/transactionStore";

const CATS: { id: TransactionCategory; label: string; emoji: string }[] = [
  { id: "gelir", label: "Gelir", emoji: "💰" },
  { id: "gider", label: "Gider", emoji: "💸" },
  { id: "alacak", label: "Alacak", emoji: "📥" },
  { id: "verecek", label: "Verecek", emoji: "📤" },
];

interface TransactionModalProps {
  open: boolean;
  onClose: () => void;
  contacts: ContactRow[];
  initialContactId?: string;
}

export function TransactionModal({ open, onClose, contacts, initialContactId }: TransactionModalProps) {
  const fetchAll = useTransactionStore((s) => s.fetchAll);
  const { planData, refresh: refreshPlan } = usePlanLimits();
  const { checkTransactionLimit } = useFeatureAccess();

  const [tagOptions, setTagOptions] = useState<DefaultCategoryRow[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [category, setCategory] = useState<TransactionCategory>("gider");
  const [amountStr, setAmountStr] = useState("");
  const [description, setDescription] = useState("");
  const [categoryTag, setCategoryTag] = useState("");
  const [contactId, setContactId] = useState("");
  const [date, setDate] = useState(todayISODate());
  const [saving, setSaving] = useState(false);

  const loadTags = useCallback(async () => {
    setTagsLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("default_categories")
      .select("id,name,icon,color,type")
      .order("name", { ascending: true });
    if (error) {
      console.error("[TransactionModal] tags", error);
      setTagOptions([]);
    } else {
      setTagOptions((data ?? []) as DefaultCategoryRow[]);
    }
    setTagsLoading(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadTags();
    setDate(todayISODate());
    setCategory("gider");
    setAmountStr("");
    setDescription("");
    setCategoryTag("");
    setContactId(initialContactId ?? "");
  }, [open, loadTags, initialContactId]);

  const tagFiltered = useMemo(
    () => tagOptions.filter((t) => t.type === category),
    [tagOptions, category]
  );

  const showContact = category === "alacak" || category === "verecek";
  const limitReached =
    planData != null && !planData.isPremium && planData.monthlyUsed >= FREE_LIMITS.monthlyTransactions;

  const handleSave = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Oturum yok");
      return;
    }

    if (!checkTransactionLimit()) return;

    const n = parseAmount(amountStr);
    if (n <= 0) {
      toast.error("Geçerli tutar girin");
      return;
    }

    if (showContact && !contactId) {
      toast.error("Alacak / verecek için kişi seçin");
      return;
    }

    setSaving(true);
    const { value: balance_after, error: balErr } = await calculateNextBalanceAfterTransaction(
      supabase,
      user.id,
      n,
      category
    );
    if (balErr) {
      toast.error(balErr);
      setSaving(false);
      return;
    }

    const insertData: Record<string, unknown> = {
      user_id: user.id,
      category,
      amount: n,
      description: description.trim() || "",
      date: date || new Date().toISOString().split("T")[0],
      contact_id: showContact ? contactId || null : null,
      category_tag: categoryTag.trim() || null,
      balance_after,
      is_paid: true,
    };

    const { error } = await supabase.from("transactions").insert(insertData);

    if (error) {
      console.error("Insert hatası:", error);
      toast.error(`Kayıt hatası: ${error.message}`);
      setSaving(false);
      return;
    }

    toast.success("✅ İşlem eklendi!");
    await fetchAll();
    void refreshPlan();
    setSaving(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Yeni işlem" footer={null}>
      {tagsLoading ? (
        <div className="space-y-3 py-2">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-[52px] w-full rounded-xl" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-sm font-bold text-[var(--text-secondary)]">Kategori</p>
            <div className="grid grid-cols-2 gap-2">
              {CATS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCategory(c.id);
                    setCategoryTag("");
                  }}
                  className={cn(
                    "flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-2xl border-[1.5px] px-2 py-2 text-center transition-all",
                    category === c.id
                      ? "border-[var(--sd-primary)] bg-[color-mix(in_srgb,var(--sd-primary)_12%,transparent)] text-[var(--sd-primary)]"
                      : "border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
                  )}
                >
                  <span className="text-xl">{c.emoji}</span>
                  <span className="text-xs font-bold">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          <AmountInput
            id="tm-amount"
            label="Tutar"
            variant="theme"
            placeholder="0"
            value={amountStr}
            onChange={setAmountStr}
          />

          <div>
            <label className="mb-1.5 block text-sm font-bold text-[var(--text-primary)]">Açıklama</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[48px] w-full rounded-xl border-[1.5px] border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--sd-primary)]"
              placeholder="İsteğe bağlı"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold text-[var(--text-primary)]">Alt kategori</label>
            <select
              value={categoryTag}
              onChange={(e) => setCategoryTag(e.target.value)}
              className="min-h-[52px] w-full rounded-xl border-[1.5px] border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 text-sm text-[var(--text-primary)]"
            >
              <option value="">—</option>
              {tagFiltered.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.icon} {t.name}
                </option>
              ))}
            </select>
          </div>

          {showContact ? (
            <div>
              <label className="mb-1.5 block text-sm font-bold text-[var(--text-primary)]">Kişi</label>
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className="min-h-[52px] w-full rounded-xl border-[1.5px] border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 text-sm text-[var(--text-primary)]"
              >
                <option value="">Seçin</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div>
            <label className="mb-1.5 block text-sm font-bold text-[var(--text-primary)]">Tarih</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="min-h-[52px] w-full rounded-xl border-[1.5px] border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 text-sm text-[var(--text-primary)]"
            />
          </div>

          {limitReached ? (
            <p className="text-center text-sm font-bold text-[var(--sd-gider)]">
              ⛔ Aylık işlem limitine ulaştınız.
            </p>
          ) : null}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" fullWidth onClick={onClose}>
              Vazgeç
            </Button>
            <Button type="button" fullWidth disabled={saving || limitReached} onClick={() => void handleSave()}>
              {saving ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
