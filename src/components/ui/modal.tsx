"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { HelpCircle, X } from "lucide-react";
import { cn } from "@/lib/cn";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** "question" renders the big circled ? icon used by confirm-style dialogs. */
  variant?: "panel" | "question";
  closeLabel?: boolean;
  className?: string;
  children: ReactNode;
};

export function Modal({ open, onClose, title, subtitle, variant = "panel", closeLabel, className, children }: ModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  // Portal to <body>: ancestors with backdrop-filter would otherwise trap position:fixed.
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Close dialog" className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-[2px]" onClick={onClose} />
      <div className={cn("surface-card relative w-full rounded-2xl p-5", variant === "question" ? "max-w-md text-center" : "max-w-lg", className)}>
        {variant === "question" ? (
          <>
            <div className="mx-auto mb-3 grid h-20 w-20 place-items-center rounded-full border-4 border-ink-muted/40 text-ink-muted/70">
              <HelpCircle className="h-10 w-10" strokeWidth={1.5} />
            </div>
            <h2 className="font-display text-2xl font-bold">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-ink-muted">{subtitle}</p> : null}
          </>
        ) : (
          <div className="mb-4 flex items-start justify-between gap-4 border-b border-white/5 pb-3">
            <div>
              <h2 className="font-display text-lg font-bold">{title}</h2>
              {subtitle ? <p className="text-[11px] text-ink-muted">{subtitle}</p> : null}
            </div>
            <button onClick={onClose} className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink">
              <X className="h-3.5 w-3.5" />
              {closeLabel === false ? null : "Close"}
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** Confirm dialog (used for destructive actions). */
export function ConfirmDialog({
  open,
  title,
  text,
  confirmLabel,
  danger,
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  text: string;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} subtitle={text} variant="question">
      <div className="mt-5 flex justify-center gap-3">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button className={cn("btn", danger ? "btn-danger" : "btn-leaf")} onClick={onConfirm} disabled={busy}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
