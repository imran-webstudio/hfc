"use client";

import { useState } from "react";
import { ArrowDownLeft, Receipt } from "lucide-react";
import { Chip, EmptyNote } from "@/components/ui/ui";
import { cn } from "@/lib/cn";
import { statusLabel } from "@/lib/labels";
import { signedTaka, taka } from "@/lib/money";
import { fmtDateTime, fmtDay } from "@/lib/time";
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
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold">{heading}</h2>
        <div className="flex rounded-xl border border-line bg-ink/[0.03] p-0.5" role="tablist">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-lg px-3 py-1 text-[11px] font-semibold transition",
                filter === f.id ? "bg-leaf/20 text-leaf-deep" : "text-ink-muted hover:text-ink",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyNote>{filter === "wallet" ? "No deposits or wallet entries yet." : filter === "orders" ? "No orders yet." : "No activity yet."}</EmptyNote>
      ) : (
        <ul className="space-y-2.5">
          {shown.map((it) =>
            it.kind === "order" ? (
              <li key={it.id} className="surface-card flex items-start gap-3.5 rounded-2xl px-4 py-3.5">
                <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-spice/15 text-spice">
                  <Receipt className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{it.title}</p>
                  <ul className="mt-0.5 space-y-0.5">
                    {it.lines.map((l, idx) => (
                      <li key={idx} className="text-[11px] text-ink-muted">
                        {l.title} × {l.quantity} · {statusLabel(l.slot)} · {taka(l.subtotal)}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-ink-muted">
                    {it.office} · meal day {fmtDay(it.mealDate)}
                  </p>
                  <p className="text-[10.5px] text-ink-muted/80">
                    Ordered {fmtDateTime(it.at)}
                    {it.placedBy ? ` · by admin ${it.placedBy}` : ""}
                  </p>
                  {it.note ? <p className="mt-0.5 text-[11px] text-ink-muted">{it.note}</p> : null}
                  {it.deliveredAt ? <p className="text-[10.5px] text-ink-muted/80">Delivered {fmtDateTime(it.deliveredAt)}</p> : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <p className="tnum text-sm font-bold">{taka(it.amount)}</p>
                  <div className="flex flex-wrap justify-end gap-1">
                    <Chip tone={statusTone(it.status)}>{statusLabel(it.status)}</Chip>
                    <Chip tone={statusTone(it.paymentStatus)}>{statusLabel(it.paymentStatus)}</Chip>
                  </div>
                </div>
              </li>
            ) : (
              <li key={it.id} className="surface-card flex items-start gap-3.5 rounded-2xl px-4 py-3.5">
                <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-leaf/15 text-leaf">
                  <ArrowDownLeft className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{LEDGER_TITLE[it.type]}</p>
                  <p className="text-[11px] text-ink-muted">{it.note ?? "—"}</p>
                  <p className="text-[10.5px] text-ink-muted/80">
                    {fmtDateTime(it.at)}
                    {it.createdBy ? ` · recorded by ${it.createdBy}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={cn("tnum text-sm font-bold", it.amount >= 0 ? "text-leaf-deep" : "text-red-400")}>{signedTaka(it.amount)}</p>
                  <p className="tnum text-[11px] text-ink-muted">balance {taka(it.balanceAfter)}</p>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  );
}
