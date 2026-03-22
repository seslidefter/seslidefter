"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { PageShell } from "@/components/layout/PageShell";
import { AmountInput, parseAmount } from "@/components/ui/AmountInput";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { usePlanLimits, type PlanLimits } from "@/hooks/usePlanLimits";
import { createClient } from "@/lib/supabase/client";
import { checkMonthlyTransactionLimit, FREE_LIMITS } from "@/lib/plan-limits";
import { calculateNextBalanceAfterTransaction } from "@/lib/transaction-balance";
import { clampAmountNum, sanitizeInput, sanitizeDate } from "@/lib/security";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTransactionStore } from "@/store/transactionStore";

export interface PaymentPlan {
  id: string;
  title: string;
  description: string | null;
  total_amount: number;
  paid_amount: number;
  installment_amount: number;
  installment_count: number;
  paid_count: number;
  start_date: string;
  due_day: number;
  category: string;
  icon: string;
  color: string;
  is_active: boolean;
}

export interface PlanPayment {
  id: string;
  plan_id: string;
  user_id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  paid_date: string | null;
  is_paid: boolean;
}

function getDaysUntil(dateStr: string): number {
  const due = new Date(dateStr + "T12:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function urgencyColor(days: number): string {
  if (days <= 3) return "#d32f2f";
  if (days <= 7) return "#f57c00";
  return "#2e7d32";
}

export function OdemelerPageClient() {
  const { t } = useLanguage();
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [payments, setPayments] = useState<PlanPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);
  const [editPlan, setEditPlan] = useState<PaymentPlan | null>(null);
  const { planData, refresh: refreshPlan } = usePlanLimits();
  const fetchAllTx = useTransactionStore((s) => s.fetchAll);

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const [plansRes, paymentsRes] = await Promise.all([
      supabase
        .from("payment_plans")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
      supabase
        .from("payment_plan_payments")
        .select("*")
        .eq("user_id", user.id)
        .order("due_date", { ascending: true }),
    ]);

    if (plansRes.error) {
      setSchemaError(plansRes.error.message);
      setPlans([]);
    } else {
      setSchemaError(null);
      setPlans((plansRes.data ?? []) as PaymentPlan[]);
    }
    if (!paymentsRes.error) {
      setPayments((paymentsRes.data ?? []) as PlanPayment[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const upcomingPayments = useMemo(() => {
    return payments
      .filter((p) => {
        if (p.is_paid) return false;
        const days = getDaysUntil(p.due_date);
        return days >= -14 && days <= 30;
      })
      .sort(
        (a, b) =>
          new Date(a.due_date + "T12:00:00").getTime() -
          new Date(b.due_date + "T12:00:00").getTime()
      );
  }, [payments]);

  const summary = useMemo(() => {
    const totalDebt = plans.reduce((s, p) => s + Number(p.total_amount), 0);
    const totalPaid = plans.reduce((s, p) => s + Number(p.paid_amount), 0);
    const now = new Date();
    const thisMonthDue = upcomingPayments
      .filter((p) => {
        const due = new Date(p.due_date + "T12:00:00");
        return due.getMonth() === now.getMonth() && due.getFullYear() === now.getFullYear();
      })
      .reduce((s, p) => s + Number(p.amount), 0);
    return { totalDebt, totalPaid, thisMonthDue };
  }, [plans, upcomingPayments]);

  const markAsPaid = async (payment: PlanPayment) => {
    const supabase = createClient();
    const uid = payment.user_id;
    if (!uid) {
      toast.error("Kullanıcı bilgisi eksik");
      return;
    }

    const plan = plans.find((p) => p.id === payment.plan_id);
    if (!plan) {
      toast.error("Plan bulunamadı");
      return;
    }

    const limit = await checkMonthlyTransactionLimit(supabase, uid);
    if (!limit.ok && limit.message) {
      toast.error(limit.message);
      return;
    }

    const amt = Number(payment.amount);
    const { value: balance_after, error: balErr } = await calculateNextBalanceAfterTransaction(
      supabase,
      uid,
      amt,
      "gider"
    );
    if (balErr) {
      toast.error(balErr);
      return;
    }

    const today = new Date().toISOString().split("T")[0]!;

    const { error: txIns } = await supabase.from("transactions").insert({
      user_id: uid,
      category: "gider",
      amount: amt,
      description: sanitizeInput(
        `${plan.icon} ${plan.title} - ${payment.installment_number}. taksit`
      ),
      date: today,
      category_tag: "odeme_plani",
      balance_after,
      is_paid: true,
      plan_id: plan.id,
    });

    if (txIns) {
      toast.error("İşlem eklenemedi: " + txIns.message);
      return;
    }

    const { error } = await supabase
      .from("payment_plan_payments")
      .update({ is_paid: true, paid_date: today })
      .eq("id", payment.id);

    if (error) {
      toast.error("Hata: " + error.message);
      return;
    }

    await supabase
      .from("payment_plans")
      .update({
        paid_amount: Number(plan.paid_amount) + amt,
        paid_count: plan.paid_count + 1,
      })
      .eq("id", plan.id);

    toast.success(t("payments.paidAndRecorded"));
    void loadData();
    void refreshPlan();
    void fetchAllTx();
  };

  async function deletePlan(planId: string) {
    if (!confirm(t("payments.deletePlanConfirm"))) return;
    const supabase = createClient();
    try {
      const { error: paymentsError } = await supabase
        .from("payment_plan_payments")
        .delete()
        .eq("plan_id", planId);

      if (paymentsError) {
        console.error("Payments silme hatası:", paymentsError);
      }

      const { error: txUpdErr } = await supabase
        .from("transactions")
        .update({ plan_id: null })
        .eq("plan_id", planId);

      if (txUpdErr) {
        console.warn("plan_id güncellenemedi (kolon yok olabilir):", txUpdErr.message);
      }

      const { error: planError } = await supabase.from("payment_plans").delete().eq("id", planId);

      if (planError) throw planError;

      toast.success(t("payments.planDeletedToast"));
      setSelectedPlan(null);
      setEditPlan(null);
      void loadData();
      void refreshPlan();
      void fetchAllTx();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`${t("payments.deleteFailed")} ${msg}`);
    }
  }

  if (loading) {
    return (
      <PageShell
        title={t("payments.title")}
        contentClassName="flex flex-col gap-4 pb-28"
        titleClassName="hidden md:block"
      >
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </PageShell>
    );
  }

  return (
    <PageShell
      title={t("payments.title")}
      contentClassName="odemeler-page flex flex-col gap-4 pb-28"
      titleClassName="hidden md:block"
    >
      {schemaError ? (
        <Card className="border-[var(--sd-gider)] p-4 text-sm text-[var(--text-primary)]">
          <p className="font-bold">{t("payments.schemaLoadError")}</p>
          <p className="mt-2 text-[var(--text-secondary)]">{schemaError}</p>
          <p className="mt-2 text-xs text-[var(--text-secondary)]">{t("payments.schemaHint")}</p>
        </Card>
      ) : null}

      <div className="page-header flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title sd-heading text-xl text-[var(--text-primary)]">
          {t("payments.pageHeading")}
        </h1>
        <Button type="button" onClick={() => setShowAddModal(true)} className="shrink-0">
          {t("payments.newPlan")}
        </Button>
      </div>

      <div className="payment-summary">
        <div className="summary-item">
          <span className="summary-label">{t("payments.totalDebt")}</span>
          <span className="summary-value">₺{summary.totalDebt.toLocaleString("tr-TR")}</span>
        </div>
        <div className="summary-item green">
          <span className="summary-label">{t("payments.paid")}</span>
          <span className="summary-value">₺{summary.totalPaid.toLocaleString("tr-TR")}</span>
        </div>
        <div className="summary-item red">
          <span className="summary-label">{t("payments.remaining")}</span>
          <span className="summary-value">
            ₺{(summary.totalDebt - summary.totalPaid).toLocaleString("tr-TR")}
          </span>
        </div>
        <div className="summary-item orange">
          <span className="summary-label">{t("payments.thisMonth")}</span>
          <span className="summary-value">₺{summary.thisMonthDue.toLocaleString("tr-TR")}</span>
        </div>
      </div>

      {upcomingPayments.length > 0 ? (
        <div className="upcoming-section">
          <h2 className="section-title sd-heading text-base text-[var(--text-primary)]">
            ⏰ {t("payments.upcoming")}
          </h2>
          {upcomingPayments.map((payment) => {
            const plan = plans.find((p) => p.id === payment.plan_id);
            const days = getDaysUntil(payment.due_date);
            const col = urgencyColor(days);
            return (
              <div
                key={payment.id}
                className="upcoming-card"
                style={{ borderLeftColor: col }}
              >
                <div className="upcoming-left flex min-w-0 flex-1 items-start gap-3">
                  <span className="upcoming-icon text-2xl">{plan?.icon ?? "💳"}</span>
                  <div className="min-w-0">
                    <div className="upcoming-title text-[var(--text-primary)]">{plan?.title}</div>
                    <div className="upcoming-meta">
                      {t("payments.installmentLine", {
                        current: payment.installment_number,
                        total: plan?.installment_count ?? 0,
                      })}{" "}
                      • {new Date(payment.due_date + "T12:00:00").toLocaleDateString("tr-TR")}
                    </div>
                    <div className="upcoming-days" style={{ color: col }}>
                      {days === 0
                        ? `⚠️ ${t("payments.today")}`
                        : days < 0
                          ? `⛔ ${t("payments.overdue", { days: Math.abs(days) })}`
                          : t("payments.daysLeft", { days })}
                    </div>
                  </div>
                </div>
                <div className="upcoming-right flex shrink-0 flex-col items-end gap-2">
                  <span className="upcoming-amount text-[var(--text-primary)]">
                    ₺{Number(payment.amount).toLocaleString("tr-TR")}
                  </span>
                  <button type="button" onClick={() => void markAsPaid(payment)} className="btn-paid">
                    ✓ Ödendi
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="plans-section">
        <h2 className="section-title sd-heading text-base text-[var(--text-primary)]">
          📋 {t("payments.allPlans")}
        </h2>
        {plans.map((plan) => {
          const progress =
            plan.installment_count > 0 ? (plan.paid_count / plan.installment_count) * 100 : 0;
          const remaining = Number(plan.total_amount) - Number(plan.paid_amount);
          const remainingInstallments = plan.installment_count - plan.paid_count;
          const nextPayment = payments.find((p) => p.plan_id === plan.id && !p.is_paid);

          return (
            <div key={plan.id} className="plan-card w-full text-left">
            <button
              type="button"
              className="w-full text-left"
              onClick={() => setSelectedPlan(plan)}
            >
              <div className="plan-header">
                <span className="plan-icon">{plan.icon}</span>
                <div className="plan-info min-w-0 flex-1">
                  <div className="plan-title">{plan.title}</div>
                  {plan.description ? <div className="plan-desc">{plan.description}</div> : null}
                </div>
                <div className="plan-total shrink-0">
                  ₺{Number(plan.total_amount).toLocaleString("tr-TR")}
                </div>
              </div>

              <div className="plan-progress-wrap">
                <div className="plan-progress-bar">
                  <div
                    className="plan-progress-fill"
                    style={{ width: `${progress}%`, background: plan.color }}
                  />
                </div>
                <span className="plan-progress-text shrink-0 text-xs text-[var(--text-secondary)]">
                  {t("payments.progressTaksit", {
                    paid: plan.paid_count,
                    total: plan.installment_count,
                  })}
                </span>
              </div>

              <div className="plan-stats">
                <div className="plan-stat">
                  <span className="stat-label">{t("payments.paid")}</span>
                  <span className="stat-value green">
                    ₺{Number(plan.paid_amount).toLocaleString("tr-TR")}
                  </span>
                </div>
                <div className="plan-stat">
                  <span className="stat-label">{t("payments.remaining")}</span>
                  <span className="stat-value red">₺{remaining.toLocaleString("tr-TR")}</span>
                </div>
                <div className="plan-stat">
                  <span className="stat-label">{t("payments.remainingInstallLabel")}</span>
                  <span className="stat-value text-[var(--text-primary)]">
                    {t("payments.remainingInstallmentsCount", { n: remainingInstallments })}
                  </span>
                </div>
              </div>

              {nextPayment ? (
                <div className="plan-next">
                  <span>
                    📅 {t("payments.nextPaymentPrefix")}{" "}
                    {new Date(nextPayment.due_date + "T12:00:00").toLocaleDateString("tr-TR", {
                      day: "numeric",
                      month: "long",
                    })}
                  </span>
                  <span className="plan-next-amount">
                    ₺{Number(nextPayment.amount).toLocaleString("tr-TR")}
                  </span>
                </div>
              ) : null}
            </button>

              <div className="flex gap-2 border-t border-[var(--border-color)] px-3 pb-3 pt-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditPlan(plan);
                  }}
                  className="flex-1 rounded-xl bg-blue-50 py-2 text-xs font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                >
                  ✏️ {t("payments.edit")}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void deletePlan(plan.id);
                  }}
                  className="flex-1 rounded-xl bg-red-50 py-2 text-xs font-bold text-red-500 dark:bg-red-900/30"
                >
                  🗑️ {t("payments.delete")}
                </button>
              </div>
            </div>
          );
        })}

        {plans.length === 0 && !schemaError ? (
          <div className="empty-state flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--border-color)] py-14">
            <span className="empty-icon text-5xl">💳</span>
            <p className="text-[var(--text-secondary)]">{t("payments.noPlan")}</p>
            <Button type="button" onClick={() => setShowAddModal(true)}>
              {t("payments.firstPlanButton")}
            </Button>
          </div>
        ) : null}
      </div>

      {showAddModal ? (
        <AddPlanModal
          t={t}
          planData={planData}
          onClose={() => setShowAddModal(false)}
          onSave={() => {
            void loadData();
            void refreshPlan();
            void fetchAllTx();
          }}
        />
      ) : null}

      {editPlan ? (
        <EditPlanModal
          t={t}
          plan={editPlan}
          onClose={() => setEditPlan(null)}
          onSave={() => {
            void loadData();
            void refreshPlan();
            setEditPlan(null);
            setSelectedPlan(null);
          }}
        />
      ) : null}

      {selectedPlan ? (
        <PlanDetailModal
          t={t}
          plan={selectedPlan}
          payments={payments.filter((p) => p.plan_id === selectedPlan.id)}
          onClose={() => setSelectedPlan(null)}
          onPaid={(p) => void markAsPaid(p)}
        />
      ) : null}
    </PageShell>
  );
}

type TFn = (key: string, params?: Record<string, string | number>) => string;

function AddPlanModal({
  t,
  onClose,
  onSave,
  planData,
}: {
  t: TFn;
  onClose: () => void;
  onSave: () => void;
  planData: PlanLimits | null;
}) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    total_amount: "",
    installment_amount: "",
    installment_count: "",
    start_date: new Date().toISOString().split("T")[0],
    due_day: "15",
    icon: "💳",
    color: "#1976D2",
  });

  const icons = ["💳", "🏠", "🚗", "📱", "🏥", "📚", "🛋️", "❄️", "🖥️", "✈️"];
  const colors = ["#1976D2", "#2E7D32", "#D32F2F", "#F57C00", "#7B1FA2", "#00796B"];

  const handleSave = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (
      planData &&
      !planData.isPremium &&
      planData.paymentPlansUsed >= FREE_LIMITS.paymentPlans
    ) {
      toast.error(`Ücretsiz planda en fazla ${FREE_LIMITS.paymentPlans} ödeme planı.`);
      return;
    }

    const totalAmount = clampAmountNum(parseAmount(form.total_amount));
    const installmentAmount = clampAmountNum(parseAmount(form.installment_amount));
    const installmentCount = Math.floor(Number(form.installment_count));
    const title = sanitizeInput(form.title);
    const planDescription = sanitizeInput(form.description) || null;
    const startDate = sanitizeDate(form.start_date);

    if (!title || !totalAmount || !installmentAmount || !installmentCount) {
      toast.error("Lütfen zorunlu alanları doldurun");
      return;
    }

    const { data: plan, error } = await supabase
      .from("payment_plans")
      .insert({
        user_id: user.id,
        title,
        description: planDescription,
        total_amount: totalAmount,
        installment_amount: installmentAmount,
        installment_count: installmentCount,
        start_date: startDate,
        due_day: Math.min(31, Math.max(1, Number(form.due_day) || 15)),
        icon: form.icon,
        color: form.color,
        paid_amount: 0,
        paid_count: 0,
      })
      .select()
      .single();

    if (error || !plan) {
      toast.error("Hata: " + (error?.message ?? "Plan oluşturulamadı"));
      return;
    }

    const planId = plan.id as string;
    const startDateObj = new Date(startDate + "T12:00:00");
    const dueDay = Math.min(31, Math.max(1, Number(form.due_day) || 15));
    const rows: Record<string, unknown>[] = [];

    for (let i = 1; i <= installmentCount; i++) {
      const dueDate = new Date(startDateObj);
      dueDate.setMonth(dueDate.getMonth() + (i - 1));
      const lastDay = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0).getDate();
      dueDate.setDate(Math.min(dueDay, lastDay));
      const iso = dueDate.toISOString().split("T")[0];
      rows.push({
        plan_id: planId,
        user_id: user.id,
        installment_number: i,
        amount: installmentAmount,
        due_date: iso,
        is_paid: false,
      });
    }

    const { error: payErr } = await supabase.from("payment_plan_payments").insert(rows);
    if (payErr) {
      toast.error("Taksitler oluşturulamadı: " + payErr.message);
      return;
    }

    const limit = await checkMonthlyTransactionLimit(supabase, user.id);
    if (!limit.ok && limit.message) {
      toast.error(limit.message);
      return;
    }

    const { value: balance_after, error: balErr } = await calculateNextBalanceAfterTransaction(
      supabase,
      user.id,
      totalAmount,
      "verecek"
    );
    if (balErr) {
      toast.error(balErr);
      return;
    }

    const { error: txErr } = await supabase.from("transactions").insert({
      user_id: user.id,
      category: "verecek",
      amount: totalAmount,
      description: sanitizeInput(`${form.icon} ${title} - Ödeme planı`),
      date: startDate,
      category_tag: "odeme_plani",
      balance_after,
      is_paid: false,
      plan_id: planId,
      contact_id: null,
    });
    if (txErr) {
      console.error(txErr);
      toast.error("Plan oluştu; borç kaydı eklenemedi: " + txErr.message);
    }

    toast.success("✅ Ödeme planı oluşturuldu!");
    onSave();
    onClose();
  };

  return (
    <div
      className="modal-overlay fixed inset-0 z-[120] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="modal-content max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-[var(--bg-card)] p-4 shadow-xl"
        role="dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">{t("payments.newPlanModalTitle")}</h2>
          <button type="button" className="text-xl text-[var(--text-secondary)]" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {icons.map((icon) => (
              <button
                key={icon}
                type="button"
                className={cn(
                  "rounded-xl border-2 p-2 text-xl",
                  form.icon === icon ? "border-[var(--sd-primary)]" : "border-transparent"
                )}
                onClick={() => setForm((f) => ({ ...f, icon }))}
              >
                {icon}
              </button>
            ))}
          </div>

          <input
            placeholder="Plan adı (örn. Buzdolabı taksidi)"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="form-input rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-[var(--text-primary)]"
          />
          <input
            placeholder="Açıklama (opsiyonel)"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="form-input rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-[var(--text-primary)]"
          />

          <div className="grid grid-cols-2 gap-2">
            <AmountInput
              label="Toplam (₺)"
              value={form.total_amount}
              onChange={(raw) => setForm((f) => ({ ...f, total_amount: raw }))}
              placeholder="0"
              className="min-w-0"
              inputClassName="!text-base"
            />
            <AmountInput
              label="Taksit (₺)"
              value={form.installment_amount}
              onChange={(raw) => setForm((f) => ({ ...f, installment_amount: raw }))}
              placeholder="0"
              className="min-w-0"
              inputClassName="!text-base"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-bold text-[var(--text-secondary)]">Taksit sayısı</label>
              <input
                type="number"
                value={form.installment_count}
                onChange={(e) => setForm((f) => ({ ...f, installment_count: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[var(--text-secondary)]">Ödeme günü</label>
              <input
                type="number"
                min={1}
                max={31}
                value={form.due_day}
                onChange={(e) => setForm((f) => ({ ...f, due_day: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-[var(--text-primary)]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[var(--text-secondary)]">Başlangıç</label>
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-[var(--text-primary)]"
            />
          </div>

          <div className="flex gap-2">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                className={cn(
                  "h-9 w-9 rounded-full border-2",
                  form.color === color ? "border-[var(--text-primary)]" : "border-transparent"
                )}
                style={{ background: color }}
                onClick={() => setForm((f) => ({ ...f, color }))}
                aria-label={color}
              />
            ))}
          </div>
        </div>

        <div className="modal-footer mt-4 flex gap-2">
          <Button type="button" variant="outline" fullWidth onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="button" fullWidth onClick={() => void handleSave()}>
            {t("payments.createPlan")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function EditPlanModal({
  t,
  plan,
  onClose,
  onSave,
}: {
  t: TFn;
  plan: PaymentPlan;
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    title: plan.title,
    description: plan.description ?? "",
    icon: plan.icon,
    color: plan.color,
  });

  const icons = ["💳", "🏠", "🚗", "📱", "🏥", "📚", "🛋️", "❄️", "🖥️", "✈️"];
  const colors = ["#1976D2", "#2E7D32", "#D32F2F", "#F57C00", "#7B1FA2", "#00796B"];

  async function handleSave() {
    const supabase = createClient();
    const { error } = await supabase
      .from("payment_plans")
      .update({
        title: sanitizeInput(form.title),
        description: sanitizeInput(form.description) || null,
        icon: form.icon,
        color: form.color,
      })
      .eq("id", plan.id);
    if (error) {
      toast.error("Güncellenemedi: " + error.message);
      return;
    }
    toast.success("✅ Plan güncellendi");
    onSave();
    onClose();
  }

  return (
    <div
      className="modal-overlay fixed inset-0 z-[120] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="modal-content max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-[var(--bg-card)] p-4 shadow-xl"
        role="dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">{t("payments.editPlanTitle")}</h2>
          <button type="button" className="text-xl text-[var(--text-secondary)]" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {icons.map((icon) => (
            <button
              key={icon}
              type="button"
              className={cn(
                "rounded-xl border-2 p-2 text-xl",
                form.icon === icon ? "border-[var(--sd-primary)]" : "border-transparent"
              )}
              onClick={() => setForm((f) => ({ ...f, icon }))}
            >
              {icon}
            </button>
          ))}
        </div>
        <input
          placeholder="Plan adı"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          className="form-input mt-3 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-[var(--text-primary)]"
        />
        <input
          placeholder="Açıklama"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          className="form-input mt-2 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-[var(--text-primary)]"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {colors.map((color) => (
            <button
              key={color}
              type="button"
              className={cn(
                "h-9 w-9 rounded-full border-2",
                form.color === color ? "border-[var(--text-primary)]" : "border-transparent"
              )}
              style={{ background: color }}
              onClick={() => setForm((f) => ({ ...f, color }))}
              aria-label={color}
            />
          ))}
        </div>
        <div className="modal-footer mt-4 flex gap-2">
          <Button type="button" variant="outline" fullWidth onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="button" fullWidth onClick={() => void handleSave()}>
            {t("common.save")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PlanDetailModal({
  t,
  plan,
  payments,
  onClose,
  onPaid,
}: {
  t: TFn;
  plan: PaymentPlan;
  payments: PlanPayment[];
  onClose: () => void;
  onPaid: (p: PlanPayment) => void;
}) {
  const sorted = [...payments].sort((a, b) => a.installment_number - b.installment_number);
  const pct =
    plan.installment_count > 0 ? (plan.paid_count / plan.installment_count) * 100 : 0;

  return (
    <div
      className="modal-overlay fixed inset-0 z-[120] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="modal-content large max-h-[85vh] w-full max-w-[600px] overflow-y-auto rounded-2xl bg-[var(--bg-card)] p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <div className="modal-header mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            {plan.icon} {plan.title}
          </h2>
          <button type="button" onClick={onClose} className="text-xl">
            ✕
          </button>
        </div>

        <div className="detail-progress mb-4">
          <div className="detail-progress-bar h-2 overflow-hidden rounded-full bg-[var(--border-color)]">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, background: plan.color }}
            />
          </div>
          <div className="detail-stats mt-2 flex flex-wrap justify-between gap-2 text-sm text-[var(--text-secondary)]">
            <span>
              {t("payments.detailPaid")}{" "}
              <strong className="text-[var(--text-primary)]">
                ₺{Number(plan.paid_amount).toLocaleString("tr-TR")}
              </strong>
            </span>
            <span>
              {t("payments.detailRemaining")}{" "}
              <strong className="text-[var(--text-primary)]">
                ₺{(Number(plan.total_amount) - Number(plan.paid_amount)).toLocaleString("tr-TR")}
              </strong>
            </span>
          </div>
        </div>

        <div className="installments-list max-h-[400px] overflow-y-auto">
          {sorted.map((payment) => (
            <div
              key={payment.id}
              className={cn(
                "installment-row flex flex-wrap items-center gap-2 border-b border-[var(--border-color)] py-2 text-sm",
                payment.is_paid && "paid opacity-60"
              )}
            >
              <div className="installment-num font-semibold text-[var(--text-primary)]">
                {payment.is_paid ? "✅" : "⬜"}{" "}
                {t("payments.installmentN", { n: payment.installment_number })}
              </div>
              <div className="installment-date text-[var(--text-secondary)]">
                {new Date(payment.due_date + "T12:00:00").toLocaleDateString("tr-TR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <div className="installment-amount ml-auto font-bold text-[var(--text-primary)]">
                ₺{Number(payment.amount).toLocaleString("tr-TR")}
              </div>
              {!payment.is_paid ? (
                <button type="button" className="btn-small-paid" onClick={() => onPaid(payment)}>
                  {t("payments.markPaidInstallment")}
                </button>
              ) : payment.paid_date ? (
                <span className="paid-date text-xs text-[#2e7d32]">
                  {new Date(payment.paid_date + "T12:00:00").toLocaleDateString("tr-TR")}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
