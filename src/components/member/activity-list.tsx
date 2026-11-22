"use client";

import { useState } from "react";
import { ArrowDownLeft, ReceiptText } from "lucide-react";
import { Chip, EmptyNote } from "@/components/ui/ui";
import { cn } from "@/lib/cn";
import { orderNumberLabel, statusLabel } from "@/lib/labels";
import { signedTaka, taka } from "@/lib/money";
import { fmtDateTime, fmtDayFull, fmtTime } from "@/lib/time";
import type { ActivityItem } from "@/server/summary";

type Filter = "all" | "orders" | "wallet";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "orders", label: "Orders" },
  { id: "wallet", label: "Deposits & wallet" },
];

const LEDGER_TITLE = { DEPOSIT: "Deposit", DUE_PAYMENT: "Due payment", ADJUSTMENT: "Balance adjustment", REFUND: "Refund", ORDER_BILL: "Order bill", CASH_PAYMENT: "Cash paid" } as const;

const statusTone = (s: string) => (s === "DELIVERED" || s === "WALLET_CHARGED" || s === "CASH_PAID" ? "leaf" : s === "CANCELLED" ? "red" : "amber");

export function ActivityList({ items, heading }: { items: ActivityItem[]; heading: string }) {
  const [filter, setFilter] = useState<Filter>("all");
  const shown = items.filter((i) => filter === "all" || (filter === "orders" ? i.kind === "order" : i.kind === "ledger"));

  return (
    <section>
      <h2 className="mb-3 font-display text-lg font-bold">{heading}</h2>
      <div className="mb-4 flex gap-1 rounded-full border border-line p-1" role="tablist">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "flex-1 whitespace-nowrap rounded-full px-1 py-2 text-[12.5px] font-semibold transition",
              filter === f.id ? "bg-[#0F3D33] text-[#5EEAD4]" : "text-ink-muted hover:text-ink",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyNote>{filter === "wallet" ? "No deposits or wallet entries yet." : filter === "orders" ? "No orders yet." : "No activity yet."}</EmptyNote>
      ) : (
        <ul className="space-y-3">
          {shown.map((it) =>
            it.kind === "order" ? (
              <li key={it.id} className="surface-card rounded-2xl px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#D4FF3A]/15 text-[#84CC16] dark:text-[#D4FF3A]">
                    <ReceiptText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="min-w-0 text-[15px] font-bold leading-snug">{it.title}</p>
                      <p className="tnum shrink-0 text-lg font-extrabold">{taka(it.amount)}</p>
                    </div>
                    <p className="mt-0.5 text-xs font-medium text-ink-muted">Order {orderNumberLabel(it.number)}</p>
                  </div>
                </div>
                {/* One order = one slot, so items carry no Lunch/Dinner tag of
                    their own; the slot sits in the meta line below instead. */}
                <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
                  {it.lines.map((l, idx) => (
                    <li key={idx} className="flex items-baseline justify-between gap-3 text-sm text-ink-muted">
                      <span className="min-w-0">
                        {l.title} × {l.quantity}
                      </span>
                      <span className="tnum shrink-0 font-semibold text-ink">{taka(l.subtotal)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[13px] font-medium text-ink-muted">
                  {[...new Set(it.lines.map((l) => statusLabel(l.slot)))].join(" + ")} · {it.office} · {fmtDayFull(it.mealDate)}
                </p>
                <p className="mt-0.5 text-[13px] text-ink-muted">
                  Ordered at {fmtTime(it.at)}
                  {it.placedBy ? ` · by ${it.placedBy}` : ""}
                  {it.deliveredAt ? ` · Delivered ${fmtTime(it.deliveredAt)}` : ""}
                </p>
                {it.note ? <p className="mt-1 text-xs italic text-ink-muted">{it.note}</p> : null}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <Chip tone={statusTone(it.status)}>{statusLabel(it.status)}</Chip>
                  <Chip tone={statusTone(it.paymentStatus)}>{statusLabel(it.paymentStatus)}</Chip>
                </div>
              </li>
            ) : (
              <li key={it.id} className="surface-card rounded-2xl px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-leaf/15 text-leaf">
                    <ArrowDownLeft className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-bold">{LEDGER_TITLE[it.type]}</p>
                      <p className={cn("tnum shrink-0 text-[15px] font-bold", it.amount >= 0 ? "text-leaf-deep" : "text-red-400")}>{signedTaka(it.amount)}</p>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between gap-3 text-xs text-ink-muted">
                      <span className="min-w-0 truncate">{it.note ?? ""}</span>
                      <span className="tnum shrink-0">balance {taka(it.balanceAfter)}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-muted/80">
                      {fmtDateTime(it.at)}
                      {it.createdBy ? ` · recorded by ${it.createdBy}` : ""}
                    </p>
                  </div>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  );
}
