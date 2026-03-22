"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { errToast, txUpdatedToast } from "@/lib/sd-toast";
import { createClient } from "@/lib/supabase/client";
import type {
  ContactRow,
  DefaultCategoryRow,
  RecurringOption,
  TransactionRow,
} from "@/types/database";
import type { AddTransactionPayload } from "@/store/transactionStore";
import { useTransactionStore } from "@/store/transactionStore";

const RECURRING: RecurringOption[] = ["none", "daily", "weekly", "monthly", "yearly"];

function normalizeRecurring(v: string | null | undefined): RecurringOption {
  if (v && RECURRING.includes(v as RecurringOption)) return v as RecurringOption;
  return "none";
}

interface EditTransactionModalProps {
  open: boolean;
  transaction: TransactionRow | null;
  onClose: () => void;
  contacts: ContactRow[];
}

export function EditTransactionModal({
  open,
  transaction,
  onClose,
  contacts,
}: EditTransactionModalProps) {
  const updateTransaction = useTransactionStore((s) => s.updateTransaction);
  const [tagOptions, setTagOptions] = useState<DefaultCategoryRow[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagsError, setTagsError] = useState<string | null>(null);

  const loadTags = useCallback(async () => {
    setTagsLoading(true);
    setTagsError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("default_categories")
      .select("id,name,icon,color,type")
      .order("name", { ascending: true });

    if (error) {
      console.error("[EditTransactionModal] default_categories", error);
      setTagsError(error.message);
      errToast(error.message);
      setTagOptions([]);
    } else {
      setTagOptions((data ?? []) as DefaultCategoryRow[]);
    }
    setTagsLoading(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      if (!cancelled) void loadTags();
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [open, loadTags]);

  const handleSubmit = async (payload: AddTransactionPayload) => {
    if (!transaction) return;
    const { error } = await updateTransaction(transaction.id, payload);
    if (error) {
      console.error("[EditTransactionModal] update", error);
      errToast(error);
      return;
    }
    txUpdatedToast();
    onClose();
  };

  if (!transaction) return null;

  return (
    <Modal open={open} onClose={onClose} title="İşlem düzenle" footer={null} className="max-w-md">
      {tagsLoading ? (
        <div className="space-y-3 py-2">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-[52px] w-full rounded-xl" />
        </div>
      ) : tagsError && tagOptions.length === 0 ? (
        <p className="text-center text-sm font-semibold text-[var(--sd-gider)]">
          Kategoriler yüklenemedi.
        </p>
      ) : (
        <TransactionForm
          key={transaction.id}
          contacts={contacts}
          tagOptions={tagOptions}
          submitLabel="Güncelle"
          defaultValues={{
            category: transaction.category,
            amount: String(Number(transaction.amount)),
            contact_id: transaction.contact_id ?? "",
            contact_select: transaction.contact_id ?? "",
            description: transaction.description ?? "",
            date: transaction.date,
            category_tag: transaction.category_tag ?? "",
            due_date: transaction.due_date ?? "",
            is_paid: transaction.is_paid !== false,
            recurring: normalizeRecurring(transaction.recurring),
            recurring_end: transaction.recurring_end ?? "",
          }}
          onCancel={onClose}
          onSubmit={handleSubmit}
        />
      )}
    </Modal>
  );
}
