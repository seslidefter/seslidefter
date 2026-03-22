"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { PageShell } from "@/components/layout/PageShell";
import { AmountInput, parseAmount } from "@/components/ui/AmountInput";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { checkMonthlyTransactionLimit } from "@/lib/plan-limits";
import { createClient } from "@/lib/supabase/client";
import { calculateNextBalanceAfterTransaction } from "@/lib/transaction-balance";
import { clampAmountNum, sanitizeInput, sanitizeOptionalDate } from "@/lib/security";
import { errToast } from "@/lib/sd-toast";
import { analyzeAlacakVerecekVoice } from "@/lib/voice-transcript";
import { cn } from "@/lib/utils";
import type {
  ContactRow,
  RecurringOption,
  TransactionCategory,
  TransactionRow,
} from "@/types/database";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuthStore } from "@/store/authStore";
import { useTransactionStore } from "@/store/transactionStore";

function resolveContactId(contacts: ContactRow[], name: string | null): string | null {
  if (!name?.trim()) return null;
  const n = name.trim().toLocaleLowerCase("tr-TR");
  const exact = contacts.find((c) => c.name.trim().toLocaleLowerCase("tr-TR") === n);
  if (exact) return exact.id;
  const first = name.trim().split(/\s+/)[0]?.toLocaleLowerCase("tr-TR");
  if (!first) return null;
  const partial = contacts.find((c) =>
    c.name.trim().toLocaleLowerCase("tr-TR").startsWith(first)
  );
  return partial?.id ?? null;
}

type DebtModal = null | "alacak" | "verecek";

function toInputDate(d: string | null | undefined): string {
  if (!d) return "";
  return String(d).slice(0, 10);
}

function DebtCreditRow({
  tx,
  contacts,
  onEdit,
  onDelete,
  onMarkPaid,
  isLast,
}: {
  tx: TransactionRow;
  contacts: ContactRow[];
  onEdit: (tx: TransactionRow) => void;
  onDelete: (id: string) => void;
  onMarkPaid: (id: string) => void;
  isLast?: boolean;
}) {
  const { t } = useLanguage();
  const contact = contacts.find((c) => c.id === tx.contact_id);
  const isAlacak = tx.category === "alacak";

  return (
    <div
      className={cn(
        "group flex items-center gap-3 py-3 pl-4 pr-2 transition-all hover:bg-gray-50 dark:hover:bg-gray-700/30",
        !isLast && "border-b border-gray-100 dark:border-gray-700"
      )}
    >
      <div
        className={`h-10 w-1 shrink-0 rounded-full ${isAlacak ? "bg-blue-500" : "bg-orange-500"}`}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">
          {contact?.name || t("debtCredit.unknownPerson")}
        </div>
        <div className="mt-0.5 truncate text-xs text-gray-500">
          {tx.description || (isAlacak ? t("transactions.credit") : t("transactions.debt"))}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              isAlacak
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
            }`}
          >
            {isAlacak ? t("debtCredit.rowCreditShort") : t("debtCredit.rowDebtShort")}
          </span>
          <span className="text-xs text-gray-400">
            {new Date(tx.date + "T12:00:00").toLocaleDateString("tr-TR", {
              day: "numeric",
              month: "short",
            })}
          </span>
          {tx.due_date && !tx.is_paid ? (
            <span className="text-xs text-amber-600 dark:text-amber-400">
              📅{" "}
              {new Date(String(tx.due_date).slice(0, 10) + "T12:00:00").toLocaleDateString("tr-TR", {
                day: "numeric",
                month: "short",
              })}
            </span>
          ) : null}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className={`text-base font-bold ${isAlacak ? "text-blue-600" : "text-orange-600"}`}>
          ₺{Number(tx.amount).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
        </div>
        <div className={`mt-0.5 text-xs ${tx.is_paid ? "text-green-600" : "text-gray-400"}`}>
          {tx.is_paid ? `✅ ${t("debtCredit.paid")}` : `⏳ ${t("debtCredit.pending")}`}
        </div>
      </div>
      <div className="flex shrink-0 gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
        {!tx.is_paid ? (
          <button
            type="button"
            onClick={() => onMarkPaid(tx.id)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-sm text-green-600 transition-all hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50"
            title={t("debtCredit.markPaid")}
          >
            ✓
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onEdit(tx)}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-sm text-blue-600 transition-all hover:bg-blue-100 dark:bg-blue-900/30"
          title={t("common.edit")}
        >
          ✏️
        </button>
        <button
          type="button"
          onClick={() => onDelete(tx.id)}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-sm text-red-500 transition-all hover:bg-red-100 dark:bg-red-900/30"
          title={t("common.delete")}
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

function EditDebtModal({
  tx,
  contacts,
  onClose,
  onSave,
}: {
  tx: TransactionRow;
  contacts: ContactRow[];
  onClose: () => void;
  onSave: () => void;
}) {
  const addContact = useTransactionStore((s) => s.addContact);
  const updateTransaction = useTransactionStore((s) => s.updateTransaction);

  const [form, setForm] = useState({
    category: tx.category,
    amount: String(Number(tx.amount)),
    description: tx.description || "",
    contact_id: tx.contact_id || "",
    date: toInputDate(tx.date),
    due_date: toInputDate(tx.due_date),
    is_paid: tx.is_paid,
  });
  const [loading, setLoading] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [showNewContact, setShowNewContact] = useState(false);

  async function handleSave() {
    const amt = parseAmount(form.amount);
    if (amt <= 0) {
      toast.error("Geçerli bir tutar girin");
      return;
    }

    setLoading(true);

    let contactId = form.contact_id;

    if (showNewContact && newContactName.trim()) {
      const { error, data } = await addContact({ name: newContactName.trim(), phone: null });
      if (error || !data) {
        toast.error(error ?? "Kişi eklenemedi");
        setLoading(false);
        return;
      }
      contactId = data.id;
    }

    const recurring = (tx.recurring as RecurringOption | null | undefined) || "none";
    const { error } = await updateTransaction(tx.id, {
      category: form.category as TransactionCategory,
      amount: amt,
      description: form.description.trim() || null,
      contact_id: contactId || null,
      date: form.date,
      due_date: form.due_date?.trim() || null,
      is_paid: form.is_paid,
      recurring,
      recurring_end: tx.recurring_end ?? null,
    });

    if (error) {
      toast.error("Güncellenemedi: " + error);
      setLoading(false);
      return;
    }

    toast.success("✅ Kayıt güncellendi");
    onSave();
    onClose();
    setLoading(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 md:items-center md:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white dark:bg-gray-800 md:max-w-md md:rounded-2xl"
        role="dialog"
        aria-labelledby="edit-debt-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-gray-700">
          <h3 id="edit-debt-title" className="text-base font-bold text-gray-900 dark:text-white">
            ✏️ Kaydı Düzenle
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm text-gray-500 dark:bg-gray-700"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 p-4">
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-600 dark:text-gray-400">Tür</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "alacak" as const, label: "📥 Alacak", color: "blue" as const },
                { value: "verecek" as const, label: "📤 Borç", color: "orange" as const },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, category: opt.value }))}
                  className={`rounded-xl border-2 py-3 text-sm font-semibold transition-all ${
                    form.category === opt.value
                      ? opt.color === "blue"
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-orange-500 bg-orange-500 text-white"
                      : "border-gray-200 text-gray-600 dark:border-gray-600 dark:text-gray-400"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <AmountInput
            label="Tutar"
            value={form.amount}
            onChange={(raw) => setForm((f) => ({ ...f, amount: raw }))}
            placeholder="0"
          />

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400">Kişi</label>
            {!showNewContact ? (
              <div className="flex gap-2">
                <select
                  value={form.contact_id}
                  onChange={(e) => setForm((f) => ({ ...f, contact_id: e.target.value }))}
                  className="flex-1 rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:border-green-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <option value="">Kişi seç (opsiyonel)</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewContact(true)}
                  className="rounded-xl border border-green-200 bg-green-50 px-3 py-3 text-sm font-semibold text-green-700 dark:border-green-700 dark:bg-green-900/30"
                >
                  + Yeni
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="Kişi adı"
                  className="flex-1 rounded-xl border-2 border-green-400 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:outline-none dark:bg-gray-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowNewContact(false);
                    setNewContactName("");
                  }}
                  className="rounded-xl bg-gray-100 px-3 py-3 text-sm text-gray-500 dark:bg-gray-700"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400">Açıklama</label>
            <input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Açıklama (opsiyonel)"
              className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:border-green-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400">
                İşlem Tarihi
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-900 focus:border-green-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400">
                Vade Tarihi
              </label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-900 focus:border-green-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-700/50">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Ödendi mi?</span>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, is_paid: !f.is_paid }))}
              className={`relative h-6 w-12 rounded-full transition-all ${form.is_paid ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`}
              aria-pressed={form.is_paid}
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${form.is_paid ? "left-7" : "left-1"}`}
              />
            </button>
          </div>
        </div>

        <div className="flex gap-3 border-t border-gray-100 p-4 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border-2 border-gray-200 py-3.5 text-sm font-semibold text-gray-600 dark:border-gray-600 dark:text-gray-400"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={loading}
            className="flex-1 rounded-xl bg-green-700 py-3.5 text-sm font-bold text-white shadow-lg shadow-green-500/20 disabled:opacity-50"
          >
            {loading ? "⏳..." : "💾 Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AlacakVerecekPage() {
  const { t } = useLanguage();
  const initialized = useAuthStore((s) => s.initialized);
  const transactions = useTransactionStore((s) => s.transactions);
  const contacts = useTransactionStore((s) => s.contacts);
  const loading = useTransactionStore((s) => s.loading);
  const fetchAll = useTransactionStore((s) => s.fetchAll);
  const addContact = useTransactionStore((s) => s.addContact);
  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const deleteTransaction = useTransactionStore((s) => s.deleteTransaction);
  const markTransactionPaid = useTransactionStore((s) => s.markTransactionPaid);

  const [debtModal, setDebtModal] = useState<DebtModal>(null);
  const [editTx, setEditTx] = useState<TransactionRow | null>(null);
  const [personName, setPersonName] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [desc, setDesc] = useState("");
  const [due, setDue] = useState("");
  const [savingDebt, setSavingDebt] = useState(false);

  const [detail, setDetail] = useState<ContactRow | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [liveLine, setLiveLine] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalBufRef = useRef("");

  const load = useCallback(() => {
    void fetchAll().then((r) => {
      if (r.error) errToast(r.error);
    });
  }, [fetchAll]);

  const handleDeleteDebtTx = useCallback(
    async (id: string) => {
      if (!confirm(t("debtCredit.deleteConfirm"))) return;
      const { error } = await deleteTransaction(id);
      if (error) {
        toast.error("Silinemedi: " + error);
        return;
      }
      toast.success("🗑️ Kayıt silindi");
      load();
    },
    [deleteTransaction, load, t]
  );

  const handleMarkPaid = useCallback(
    async (id: string) => {
      const { error } = await markTransactionPaid(id);
      if (error) {
        toast.error("Güncellenemedi: " + error);
        return;
      }
      toast.success("✅ Ödendi olarak işaretlendi");
      load();
    },
    [markTransactionPaid, load]
  );

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    let al = 0,
      ve = 0;
    for (const t of transactions) {
      const a = Number(t.amount);
      if (t.category === "alacak") al += a;
      if (t.category === "verecek") ve += a;
    }
    return { al, ve };
  }, [transactions]);

  const creditTransactions = useMemo(
    () =>
      transactions
        .filter((t) => t.category === "alacak")
        .sort((a, b) => b.date.localeCompare(a.date)),
    [transactions]
  );

  const debtTransactions = useMemo(
    () =>
      transactions
        .filter((t) => t.category === "verecek")
        .sort((a, b) => b.date.localeCompare(a.date)),
    [transactions]
  );

  const detailTx = useMemo(() => {
    if (!detail) return [];
    return transactions
      .filter((t) => t.contact_id === detail.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, detail]);

  const nameSuggestions = useMemo(() => {
    const q = personName.trim().toLocaleLowerCase("tr-TR");
    if (q.length < 1) return [];
    return contacts
      .filter((c) => c.name.toLocaleLowerCase("tr-TR").includes(q))
      .slice(0, 6);
  }, [contacts, personName]);

  const clearSilence = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const resetVoice = useCallback(() => {
    setLiveLine("");
    finalBufRef.current = "";
  }, []);

  const trySaveVoice = useCallback(
    async (text: string) => {
      const trimmed = text.replace(/\s+/g, " ").trim();
      if (!trimmed) return;

      const r = analyzeAlacakVerecekVoice(trimmed);
      console.log("Ses analizi sonucu:", r);
      if (r.amount == null || r.amount <= 0) {
        toast.error('❌ Tutar anlaşılamadı: "Ali\'den 500 lira alacağım" gibi söyleyin');
        resetVoice();
        return;
      }
      if (r.amount > 1_000_000) {
        toast.error("❌ Tutar çok büyük görünüyor. Tekrar deneyin.");
        resetVoice();
        return;
      }
      if (r.category !== "alacak" && r.category !== "verecek") {
        toast.error("❌ Alacak veya borç ifadesi anlaşılamadı.");
        resetVoice();
        return;
      }
      if (!r.contactName?.trim()) {
        toast.error("❌ Kişi adı anlaşılamadı.");
        resetVoice();
        return;
      }

      let contact_id = resolveContactId(contacts, r.contactName);
      if (!contact_id) {
        const { error, data } = await addContact({ name: r.contactName.trim(), phone: null });
        if (error || !data) {
          toast.error(error ?? "Kişi eklenemedi");
          resetVoice();
          return;
        }
        contact_id = data.id;
      }

      const cat = r.category as TransactionCategory;
      const { error } = await addTransaction({
        category: cat,
        amount: r.amount,
        description: trimmed,
        transcript: trimmed,
        contact_id,
        is_paid: false,
        recurring: "none",
      });

      if (error) {
        toast.error(`❌ ${error}`);
        resetVoice();
        return;
      }

      const label = cat === "alacak" ? "Alacak" : "Borç";
      toast.success(`✅ ${label}: ₺${r.amount.toLocaleString("tr-TR")}`);
      resetVoice();
    },
    [addContact, addTransaction, contacts, resetVoice]
  );

  const onRecognitionEnd = useCallback(async () => {
    recognitionRef.current = null;
    const text = finalBufRef.current.replace(/\s+/g, " ").trim();
    setIsRecording(false);
    setLiveLine("");
    clearSilence();
    if (text) await trySaveVoice(text);
    finalBufRef.current = "";
  }, [clearSilence, trySaveVoice]);

  const toggleVoice = useCallback(() => {
    if (isRecording) {
      try {
        recognitionRef.current?.stop();
      } catch (e) {
        console.error(e);
      }
      return;
    }

    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      toast.error("❌ Bu tarayıcıda ses tanıma yok.");
      return;
    }

    finalBufRef.current = "";
    setLiveLine("");
    setIsRecording(true);

    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "tr-TR";
    recognitionRef.current = rec;

    rec.onresult = (event: SpeechRecognitionEvent) => {
      clearSilence();
      let interim = "";
      let finalText = finalBufRef.current;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        const piece = r[0]?.transcript ?? "";
        if (r.isFinal) finalText = `${finalText} ${piece}`.trim();
        else interim = `${interim} ${piece}`.trim();
      }
      finalBufRef.current = finalText;
      const display = [finalText, interim].filter(Boolean).join(" ").trim();
      setLiveLine(display || "…");
      silenceTimerRef.current = setTimeout(() => {
        try {
          rec.stop();
        } catch (e) {
          console.error(e);
        }
      }, 2000);
    };

    rec.onerror = (ev: SpeechRecognitionErrorEvent) => {
      if (ev.error === "not-allowed") toast.error("❌ Mikrofon izni gerekli");
    };
    rec.onend = () => void onRecognitionEnd();

    try {
      rec.start();
    } catch (e) {
      console.error(e);
      toast.error("❌ Mikrofon başlatılamadı");
      setIsRecording(false);
    }
  }, [clearSilence, isRecording, onRecognitionEnd]);

  const submitDebt = async () => {
    if (!debtModal) return;
    const name = personName.trim();
    if (name.length < 2) {
      errToast("Kişi adı gerekli");
      return;
    }
    const n = parseAmount(amountStr);
    if (n <= 0) {
      errToast("Geçerli tutar girin");
      return;
    }
    setSavingDebt(true);
    let contact_id = resolveContactId(contacts, name);
    if (!contact_id) {
      const { error, data } = await addContact({ name, phone: null });
      if (error || !data) {
        errToast(error ?? "Kişi eklenemedi");
        setSavingDebt(false);
        return;
      }
      contact_id = data.id;
    }
    const category: TransactionCategory = debtModal === "alacak" ? "alacak" : "verecek";
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      errToast("Oturum yok");
      setSavingDebt(false);
      return;
    }

    const limit = await checkMonthlyTransactionLimit(supabase, user.id);
    if (!limit.ok && limit.message) {
      errToast(limit.message);
      setSavingDebt(false);
      return;
    }

    const { value: balance_after, error: balErr } = await calculateNextBalanceAfterTransaction(
      supabase,
      user.id,
      n,
      category
    );
    if (balErr) {
      errToast(balErr);
      setSavingDebt(false);
      return;
    }

    const row: Record<string, unknown> = {
      user_id: user.id,
      category,
      amount: n,
      description: sanitizeInput(desc),
      date: new Date().toISOString().split("T")[0],
      contact_id,
      balance_after,
      is_paid: false,
      category_tag: null,
    };
    const dd = sanitizeOptionalDate(due);
    if (dd) row.due_date = dd;

    const { error } = await supabase.from("transactions").insert(row);
    setSavingDebt(false);
    if (error) errToast(error.message);
    else {
      toast.success(debtModal === "alacak" ? "✅ Alacak kaydedildi" : "✅ Borç kaydedildi");
      void fetchAll();
      setDebtModal(null);
      setPersonName("");
      setAmountStr("");
      setDesc("");
      setDue("");
    }
  };

  const openDebt = (m: DebtModal) => {
    setDebtModal(m);
    setPersonName("");
    setAmountStr("");
    setDesc("");
    setDue("");
  };

  if (!initialized || (loading && contacts.length === 0)) {
    return (
      <PageShell
        title={t("debtCredit.title")}
        contentClassName="flex flex-col gap-4"
        titleClassName="hidden md:block"
      >
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </PageShell>
    );
  }

  return (
    <PageShell
      title={t("debtCredit.title")}
      contentClassName="mx-auto w-full max-w-4xl flex flex-col gap-4 px-4 py-5 pb-28"
      titleClassName="hidden md:block"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-black text-gray-900 dark:text-white">{t("debtCredit.title")}</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => openDebt("alacak")}
            className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white"
          >
            {t("debtCredit.addCredit")}
          </button>
          <button
            type="button"
            onClick={() => openDebt("verecek")}
            className="rounded-xl bg-orange-500 px-3 py-2 text-xs font-bold text-white"
          >
            {t("debtCredit.addDebt")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <div className="mb-1 text-xs font-bold uppercase text-blue-600 dark:text-blue-400">
            {t("debtCredit.totalCredit")}
          </div>
          <div className="text-2xl font-black text-blue-700 dark:text-blue-300">
            ₺{totals.al.toLocaleString("tr-TR")}
          </div>
        </div>
        <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20">
          <div className="mb-1 text-xs font-bold uppercase text-orange-600 dark:text-orange-400">
            {t("debtCredit.totalDebt")}
          </div>
          <div className="text-2xl font-black text-orange-700 dark:text-orange-300">
            ₺{totals.ve.toLocaleString("tr-TR")}
          </div>
        </div>
      </div>

      <div
        className={cn(
          "voice-bar",
          isRecording && "ring-2 ring-[var(--sd-gider)] ring-offset-2 ring-offset-[var(--bg-primary)]"
        )}
      >
        <button
          type="button"
          className="voice-btn"
          onClick={() => toggleVoice()}
          aria-label={isRecording ? "Durdur" : "Sesle ekle"}
        >
          {isRecording ? "🔴" : "🎙️"}
        </button>
        <button type="button" className="voice-text min-w-0 flex-1 text-left" onClick={() => toggleVoice()}>
          {isRecording ? liveLine || "Dinleniyor…" : "Sesle ekle — örn. Ali'den 500 lira alacağım"}
        </button>
      </div>

      <div className="mb-6">
        <div className="mb-3 flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-blue-500" />
          <h2 className="text-base font-bold text-gray-900 dark:text-white">{t("debtCredit.credits")}</h2>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
            {creditTransactions.length}
          </span>
        </div>
        {creditTransactions.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-2 text-3xl">📥</div>
            <p className="text-sm text-gray-400">{t("debtCredit.noCredit")}</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800">
            {creditTransactions.map((tx, i) => (
              <DebtCreditRow
                key={tx.id}
                tx={tx}
                contacts={contacts}
                onEdit={setEditTx}
                onDelete={handleDeleteDebtTx}
                onMarkPaid={handleMarkPaid}
                isLast={i === creditTransactions.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-orange-500" />
          <h2 className="text-base font-bold text-gray-900 dark:text-white">{t("debtCredit.debts")}</h2>
          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700 dark:bg-orange-900/40 dark:text-orange-400">
            {debtTransactions.length}
          </span>
        </div>
        {debtTransactions.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-2 text-3xl">📤</div>
            <p className="text-sm text-gray-400">{t("debtCredit.noDebt")}</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800">
            {debtTransactions.map((tx, i) => (
              <DebtCreditRow
                key={tx.id}
                tx={tx}
                contacts={contacts}
                onEdit={setEditTx}
                onDelete={handleDeleteDebtTx}
                onMarkPaid={handleMarkPaid}
                isLast={i === debtTransactions.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? detail.name : ""}
      >
        {detail ? (
          <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700">
            {detailTx.length === 0 ? (
              <p className="p-4 text-sm text-[var(--text-secondary)]">Kayıt yok.</p>
            ) : (
              detailTx.map((t: TransactionRow, i: number) => (
                <DebtCreditRow
                  key={t.id}
                  tx={t}
                  contacts={contacts}
                  onEdit={setEditTx}
                  onDelete={handleDeleteDebtTx}
                  onMarkPaid={handleMarkPaid}
                  isLast={i === detailTx.length - 1}
                />
              ))
            )}
          </div>
        ) : null}
      </Modal>

      {editTx ? (
        <EditDebtModal
          tx={editTx}
          contacts={contacts}
          onClose={() => setEditTx(null)}
          onSave={() => {
            setEditTx(null);
            load();
          }}
        />
      ) : null}

      <Modal
        open={debtModal != null}
        onClose={() => setDebtModal(null)}
        title={debtModal === "alacak" ? t("debtCredit.addCreditTitle") : t("debtCredit.addDebtTitle")}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setDebtModal(null)}>
              {t("common.cancel")}
            </Button>
            <Button type="button" disabled={savingDebt} onClick={() => void submitDebt()}>
              {t("common.save")}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="relative">
            <Input
              label="Kişi adı"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              placeholder="Örn. Ali Yılmaz"
              autoComplete="off"
            />
            {nameSuggestions.length > 0 ? (
              <ul
                className="absolute z-20 mt-1 max-h-40 w-full overflow-auto rounded-xl border text-sm shadow-lg"
                style={{
                  borderColor: "var(--border-color)",
                  background: "var(--bg-card)",
                }}
              >
                {nameSuggestions.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                      onClick={() => setPersonName(c.name)}
                    >
                      {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <AmountInput
            label="Tutar"
            value={amountStr}
            onChange={setAmountStr}
            placeholder="0"
          />
          <Input label="Açıklama" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <Input type="date" label="Vade (isteğe bağlı)" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
      </Modal>
    </PageShell>
  );
}
