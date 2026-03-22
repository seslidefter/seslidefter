"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { ReceiptScanner } from "@/components/ocr/ReceiptScanner";
import { AmountInput, parseAmount } from "@/components/ui/AmountInput";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import toast from "react-hot-toast";
import { errToast } from "@/lib/sd-toast";
import {
  clampAmountNum,
  sanitizeInput,
  sanitizeDate,
  sanitizeOptionalDate,
} from "@/lib/security";
import { cn, todayISODate } from "@/lib/utils";
import type { ContactRow, DefaultCategoryRow, TransactionCategory } from "@/types/database";
import type { AddTransactionPayload } from "@/store/transactionStore";
import { useTransactionStore } from "@/store/transactionStore";

const schema = z
  .object({
    category: z.enum(["gelir", "gider", "alacak", "verecek"]),
    amount: z.string().min(1, "Tutar gerekli"),
    contact_select: z.string(),
    new_contact_name: z.string().optional(),
    description: z.string().optional(),
    date: z.string().min(1),
    category_tag: z.string().optional(),
    due_date: z.string().optional(),
    is_paid: z.boolean(),
    recurring: z.enum(["none", "daily", "weekly", "monthly", "yearly"]),
    recurring_end: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.contact_select === "__new__") {
      const n = data.new_contact_name?.trim() ?? "";
      if (n.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "En az 2 karakter",
          path: ["new_contact_name"],
        });
      }
    }
  });

export type TransactionFormValues = z.infer<typeof schema>;

const CAT_UI: { id: TransactionCategory; label: string; emoji: string }[] = [
  { id: "gelir", label: "Gelir", emoji: "💰" },
  { id: "gider", label: "Gider", emoji: "💸" },
  { id: "alacak", label: "Alacak", emoji: "📥" },
  { id: "verecek", label: "Borç", emoji: "📤" },
];

interface TransactionFormProps {
  contacts: ContactRow[];
  tagOptions: DefaultCategoryRow[];
  defaultValues?: Partial<TransactionFormValues> & { contact_id?: string };
  submitLabel?: string;
  disabled?: boolean;
  onSubmit: (values: AddTransactionPayload) => Promise<void>;
  onCancel?: () => void;
}

export function TransactionForm({
  contacts,
  tagOptions,
  defaultValues,
  submitLabel = "Kaydet",
  disabled,
  onSubmit,
  onCancel,
}: TransactionFormProps) {
  const addContact = useTransactionStore((s) => s.addContact);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: defaultValues?.category ?? "gelir",
      amount: defaultValues?.amount ?? "",
      contact_select:
        defaultValues?.contact_select ??
        (defaultValues?.contact_id && defaultValues.contact_id !== ""
          ? defaultValues.contact_id
          : ""),
      new_contact_name: "",
      description: defaultValues?.description ?? "",
      date: defaultValues?.date ?? todayISODate(),
      category_tag: defaultValues?.category_tag ?? "",
      due_date: defaultValues?.due_date ?? "",
      is_paid: defaultValues?.is_paid ?? true,
      recurring: defaultValues?.recurring ?? "none",
    },
  });

  const cat = watch("category");
  const contactSelect = watch("contact_select");

  const tagFiltered = useMemo(
    () => tagOptions.filter((t) => t.type === cat),
    [tagOptions, cat]
  );

  const pickCategory = (c: TransactionCategory) => {
    setValue("category", c, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    setValue("category_tag", "");
  };

  const run = handleSubmit(async (v) => {
    const n = clampAmountNum(parseAmount(v.amount));
    if (n <= 0) {
      errToast("Geçerli tutar girin");
      return;
    }

    let contact_id: string | null = null;
    if (v.contact_select && v.contact_select !== "__new__") {
      contact_id = v.contact_select;
    } else if (v.contact_select === "__new__") {
      const { error, data } = await addContact({
        name: sanitizeInput(v.new_contact_name!.trim(), 200),
      });
      if (error || !data) {
        errToast(error || "Kişi eklenemedi");
        return;
      }
      contact_id = data.id;
    }

    const payload: AddTransactionPayload = {
      category: v.category,
      amount: n,
      contact_id,
      description: (() => {
        const d = sanitizeInput(v.description ?? "");
        return d || null;
      })(),
      date: sanitizeDate(v.date),
      category_tag: (() => {
        const tag = sanitizeInput(v.category_tag ?? "");
        return tag || null;
      })(),
      due_date: sanitizeOptionalDate(v.due_date),
      is_paid: v.is_paid,
      recurring: v.recurring,
      recurring_end:
        v.recurring === "monthly" || v.recurring === "yearly"
          ? sanitizeOptionalDate(v.recurring_end)
          : null,
    };

    await onSubmit(payload);
  });

  const showDue = cat === "alacak" || cat === "verecek";
  const showRecurringEnd = cat === "gider" || cat === "gelir";
  const rec = watch("recurring");

  return (
    <form onSubmit={run} className="flex flex-col gap-5">
      <input type="hidden" {...register("category")} />

      <ReceiptScanner
        onResult={(r) => {
          pickCategory("gider");
          if (r.amount != null) {
            setValue("amount", String(r.amount), { shouldDirty: true, shouldValidate: true });
          }
          setValue("date", r.date, { shouldDirty: true });
          setValue("description", r.description, { shouldDirty: true });
          if (r.categoryTag) {
            setValue("category_tag", r.categoryTag, { shouldDirty: true });
          }
          toast.success("✅ Fiş okundu, formu kontrol edin");
        }}
      />

      <div>
        <p className="mb-2 text-sm font-bold text-black/60">Kategori</p>
        <div className="grid grid-cols-2 gap-2">
          {CAT_UI.map(({ id, label, emoji }) => (
            <button
              key={id}
              type="button"
              onClick={() => pickCategory(id)}
              className={cn(
                "flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-2xl border-[1.5px] px-2 py-2 text-center transition-all duration-200 ease-in-out",
                cat === id
                  ? "border-[var(--sd-primary)] bg-[color-mix(in_srgb,var(--sd-primary)_12%,white)] text-[var(--sd-primary)] shadow-sm"
                  : "border-black/10 bg-white text-black/55 hover:border-black/15 hover:bg-black/[0.02]"
              )}
            >
              <span className="text-xl" aria-hidden>
                {emoji}
              </span>
              <span className="text-xs font-bold">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <Controller
        name="amount"
        control={control}
        render={({ field }) => (
          <AmountInput
            id="tx-amount"
            label="Tutar"
            variant="theme"
            placeholder="0"
            disabled={disabled}
            value={field.value}
            onChange={field.onChange}
            error={errors.amount?.message}
          />
        )}
      />

      <div>
        <label className="mb-1.5 block text-sm font-bold">Alt kategori</label>
        <select
          disabled={disabled || tagFiltered.length === 0}
          className="min-h-[52px] w-full rounded-xl border-[1.5px] border-black/12 bg-[var(--sd-card)] px-4 py-3 text-sm font-medium focus:border-[var(--sd-primary)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--sd-primary)_25%,transparent)]"
          {...register("category_tag")}
        >
          <option value="">—</option>
          {tagFiltered.map((t) => (
            <option key={t.id} value={t.name}>
              {t.icon} {t.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-bold">Kişi</label>
        <select
          disabled={disabled}
          className="min-h-[52px] w-full rounded-xl border-[1.5px] border-black/12 bg-[var(--sd-card)] px-4 py-3 text-sm font-medium transition-all duration-200 focus:border-[var(--sd-primary)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--sd-primary)_25%,transparent)]"
          {...register("contact_select")}
        >
          <option value="">Kişi yok</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value="__new__">+ Yeni kişi ekle</option>
        </select>
      </div>

      {contactSelect === "__new__" ? (
        <Input
          label="Yeni kişi adı"
          placeholder="Örn. Ahmet Yılmaz"
          disabled={disabled}
          error={errors.new_contact_name?.message}
          {...register("new_contact_name")}
        />
      ) : null}

      <div>
        <label htmlFor="tx-desc" className="mb-1.5 block text-sm font-bold">
          Açıklama
        </label>
        <textarea
          id="tx-desc"
          rows={3}
          disabled={disabled}
          className="w-full resize-y rounded-xl border-[1.5px] border-black/12 bg-[var(--sd-card)] px-4 py-3 text-sm font-medium transition-all duration-200 focus:border-[var(--sd-primary)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--sd-primary)_25%,transparent)]"
          placeholder="İsteğe bağlı not"
          {...register("description")}
        />
      </div>

      <Input type="date" label="Tarih" disabled={disabled} error={errors.date?.message} {...register("date")} />

      {showDue ? (
        <Input type="date" label="Vade tarihi" disabled={disabled} {...register("due_date")} />
      ) : null}

      <label className="flex items-center gap-2 text-sm font-bold">
        <input type="checkbox" className="h-4 w-4 rounded" {...register("is_paid")} disabled={disabled} />
        Ödendi
      </label>

      <div>
        <label className="mb-1.5 block text-sm font-bold">Tekrarlama</label>
        <select
          disabled={disabled}
          className="min-h-[52px] w-full rounded-xl border-[1.5px] border-black/12 bg-[var(--sd-card)] px-4 py-3 text-sm font-medium"
          {...register("recurring")}
        >
          <option value="none">Yok</option>
          <option value="daily">Günlük</option>
          <option value="weekly">Haftalık</option>
          <option value="monthly">Aylık</option>
          <option value="yearly">Yıllık</option>
        </select>
      </div>

      {showRecurringEnd && (rec === "monthly" || rec === "yearly") ? (
        <Input
          type="date"
          label="Tekrarlama bitiş tarihi"
          disabled={disabled}
          {...register("recurring_end")}
        />
      ) : null}

      <div className="flex flex-col gap-2 pt-1">
        {onCancel ? (
          <Button type="button" variant="outline" fullWidth disabled={disabled} onClick={onCancel}>
            Vazgeç
          </Button>
        ) : null}
        <Button type="submit" fullWidth disabled={disabled || isSubmitting}>
          {isSubmitting ? "Kaydediliyor…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
