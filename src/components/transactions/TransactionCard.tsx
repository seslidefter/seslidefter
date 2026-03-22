"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { tagColorFor, tagIconFor } from "@/lib/tag-display";
import { sendWhatsAppReminder } from "@/lib/whatsapp";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn, formatShortDate, formatTry, getCategoryLabel } from "@/lib/utils";
import type { TransactionRow } from "@/types/database";

function amountStyle(t: TransactionRow): { sign: string; color: string } {
  if (t.category === "gider" || t.category === "verecek") {
    return { sign: "−", color: "var(--sd-gider)" };
  }
  if (t.category === "alacak") {
    return { sign: "+", color: "var(--sd-alacak)" };
  }
  return { sign: "+", color: "var(--sd-gelir)" };
}

interface TransactionCardProps {
  transaction: TransactionRow;
  onDelete: (id: string) => void;
  onEdit: (t: TransactionRow) => void;
  /** İşlemler listesinde `created_at` saatini göster */
  showCreatedTime?: boolean;
}

const revealWidth = 112;

export function TransactionCard({
  transaction: tx,
  onDelete,
  onEdit,
  showCreatedTime = false,
}: TransactionCardProps) {
  const { t } = useLanguage();
  const [dx, setDx] = useState(0);
  const startX = useRef(0);
  const baseDx = useRef(0);
  const dxRef = useRef(0);
  useEffect(() => {
    dxRef.current = dx;
  }, [dx]);

  const { sign, color } = amountStyle(tx);
  const kasaLabel =
    tx.balance_after != null && !Number.isNaN(tx.balance_after)
      ? `Kasa: ${formatTry(tx.balance_after)}`
      : null;

  const title =
    tx.description?.trim() || tx.transcript?.trim() || getCategoryLabel(tx.category) || "İşlem";
  const personLine = tx.contacts?.name?.trim() || "—";
  const timeLine = showCreatedTime
    ? new Date(tx.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
    : null;
  const icon = tagIconFor(tx.category_tag);
  const iconBg = tagColorFor(tx.category_tag);

  const handleStart = useCallback((clientX: number) => {
    startX.current = clientX;
    baseDx.current = dxRef.current;
  }, []);

  const handleMove = useCallback((clientX: number) => {
    const delta = clientX - startX.current;
    setDx(Math.min(0, Math.max(-revealWidth, baseDx.current + delta)));
  }, []);

  const handleEnd = useCallback(() => {
    setDx((d) => (d < -revealWidth / 2 ? -revealWidth : 0));
  }, []);

  const onDeleteClick = () => {
    if (typeof window !== "undefined" && !window.confirm(t("transactions.deleteConfirm"))) {
      return;
    }
    onDelete(tx.id);
    setDx(0);
  };

  return (
    <div className="group relative overflow-hidden rounded-[var(--sd-radius)]">
      <div
        className="absolute inset-y-0 right-0 flex w-[112px]"
        style={{ pointerEvents: dx < -16 ? "auto" : "none" }}
      >
        <button
          type="button"
          className="flex flex-1 items-center justify-center bg-[var(--sd-primary)] text-white"
          onClick={() => {
            onEdit(tx);
            setDx(0);
          }}
          aria-label={t("common.edit")}
        >
          <Pencil className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="flex flex-1 items-center justify-center bg-[var(--sd-gider)] text-white"
          onClick={onDeleteClick}
          aria-label={t("common.delete")}
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>
      <div
        className="sd-card relative flex gap-2.5 rounded-[var(--sd-radius)] border border-black/[0.06] bg-[var(--sd-card)] py-2.5 pl-2.5 pr-2 transition-transform duration-200 ease-out md:pr-1"
        style={{ transform: `translateX(${dx}px)` }}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base"
          style={{ backgroundColor: `${iconBg}28` }}
        >
          <span aria-hidden>{icon}</span>
        </div>
        <div className="min-w-0 flex-1 py-0.5">
          <p className="line-clamp-2 text-sm font-bold text-[var(--sd-text)]">{title}</p>
          <p className="mt-0.5 text-[11px] font-semibold text-black/45 dark:text-white/45">
            {personLine} · {formatShortDate(tx.date)}
            {timeLine ? ` · ${timeLine}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-stretch gap-1">
          {(tx.category === "alacak" || tx.category === "verecek") && tx.contacts?.name ? (
            <div className="flex flex-col justify-center">
              <button
                type="button"
                className="whatsapp-reminder-btn"
                title="WhatsApp hatırlatma"
                onClick={() => {
                  const c = tx.contacts!;
                  sendWhatsAppReminder(
                    c.phone ?? "",
                    c.name,
                    Math.abs(Number(tx.amount)),
                    tx.category === "alacak" ? "alacak" : "verecek",
                    tx.due_date
                  );
                }}
              >
                <span aria-hidden>📱</span>
              </button>
            </div>
          ) : null}
          <div className="flex flex-col items-end justify-center text-right">
            <p className="sd-num text-base font-extrabold leading-tight" style={{ color }}>
              {sign}
              {formatTry(Math.abs(Number(tx.amount)))}
            </p>
            {kasaLabel ? (
              <p className="mt-0.5 max-w-[7rem] truncate text-[10px] font-semibold text-black/40">
                {kasaLabel}
              </p>
            ) : null}
          </div>
          <div
            className={cn(
              "flex shrink-0 flex-col justify-center gap-0.5 pl-1",
              "opacity-100 md:opacity-0 md:transition-opacity md:duration-200 md:group-hover:opacity-100"
            )}
          >
            <button
              type="button"
              onClick={() => onEdit(tx)}
              className="rounded-lg p-2 text-[var(--sd-primary)] hover:bg-black/[0.05]"
              aria-label={t("common.edit")}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onDeleteClick}
              className="rounded-lg p-2 text-[var(--sd-gider)] hover:bg-black/[0.05]"
              aria-label={t("common.delete")}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
