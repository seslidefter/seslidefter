"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, footer, children, className }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sd-modal-title"
    >
      <button
        type="button"
        className="pointer-events-auto absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label="Kapat"
        onClick={onClose}
      />
      <div
        className={cn(
          "pointer-events-auto relative z-10 flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col rounded-t-3xl bg-[var(--bg-card)] shadow-2xl sm:rounded-3xl",
          className
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between border-b px-5 py-4"
          style={{ borderColor: "var(--border-color)" }}
        >
          <h2 id="sd-modal-title" className="sd-heading pr-2 text-lg text-[var(--text-primary)]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl p-2 text-sm font-bold text-[var(--text-secondary)] hover:opacity-80"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer != null ? (
          <div
            className="flex flex-wrap items-center justify-end gap-2 border-t px-5 py-4"
            style={{ borderColor: "var(--border-color)" }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
