"use client";

import Image from "next/image";
import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { cancelOrderAction, placeOrderAction } from "@/actions/member";
import { useAct } from "@/components/ui/use-act";
import { Chip } from "@/components/ui/ui";
import { taka } from "@/lib/money";
import { cn } from "@/lib/cn";

export type MenuItem = { id: string; title: string; description: string | null; price: number; imageUrl: string | null };
export type ExistingOrder = { id: string; title: string; quantity: number; amount: number; status: string };

export function SlotMenu({
  slot,
  date,
  items,
  open,
  reason,
  cutoff,
  existing,
}: {
  slot: "LUNCH" | "DINNER";
  date: string;
  items: MenuItem[];
  open: boolean;
  reason?: string;
  cutoff: string;
  existing: ExistingOrder | null;
}) {
  const { act, pending } = useAct();
  const [selected, setSelected] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const label = slot === "LUNCH" ? "Lunch" : "Dinner";
  const chosen = items.find((i) => i.id === selected);

  return (
    <section className="surface-card rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-display text-sm font-bold">{label}</h3>
        {open ? <Chip tone="leaf">Closes {cutoff}</Chip> : <Chip tone="amber">{reason ?? "Closed"}</Chip>}
      </div>

      {existing ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-leaf/25 bg-leaf/[0.07] px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-leaf">Your order</p>
            <p className="text-sm font-bold">
              {existing.title} <span className="text-ink-muted">× {existing.quantity}</span>
            </p>
            <p className="text-xs text-ink-muted">{taka(existing.amount)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Chip tone={existing.status === "DELIVERED" ? "leaf" : "amber"}>{existing.status}</Chip>
            {existing.status === "PENDING" ? (
              <button
                className="btn btn-ghost btn-sm"
                disabled={pending}
                onClick={() => act(() => cancelOrderAction(existing.id), { success: "Order cancelled" })}
              >
                Cancel order
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          <ul className="grid gap-2 sm:grid-cols-2">
            {items.map((it) => {
              const active = selected === it.id;
              return (
                <li key={it.id}>
                  <button
                    type="button"
                    disabled={!open}
                    aria-pressed={active}
                    onClick={() => setSelected(active ? null : it.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition disabled:opacity-50",
                      active ? "border-leaf bg-leaf/10 ring-1 ring-leaf/40" : "border-line bg-white/[0.02] hover:bg-white/5",
                    )}
                  >
                    {it.imageUrl ? (
                      <Image src={it.imageUrl} alt="" width={48} height={48} unoptimized className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                    ) : null}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{it.title}</span>
                      {it.description ? <span className="block truncate text-[11px] text-ink-muted">{it.description}</span> : null}
                    </span>
                    <span className="font-display text-sm font-bold text-spice-deep">{taka(it.price)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {chosen && open ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-3">
              <div className="flex items-center gap-2">
                <span className="field-label !mb-0">Quantity</span>
                <div className="flex items-center rounded-xl border border-line bg-white/[0.03]">
                  <button aria-label="Decrease" className="grid h-8 w-8 place-items-center text-ink-muted hover:text-ink" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-7 text-center text-sm font-bold">{qty}</span>
                  <button aria-label="Increase" className="grid h-8 w-8 place-items-center text-ink-muted hover:text-ink" onClick={() => setQty((q) => Math.min(20, q + 1))}>
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <button
                className="btn btn-spice"
                disabled={pending}
                onClick={() =>
                  act(() => placeOrderAction({ optionId: chosen.id, date, quantity: qty }), {
                    success: `${label} order placed — ${taka(chosen.price * qty)}`,
                    onOk: () => {
                      setSelected(null);
                      setQty(1);
                    },
                  })
                }
              >
                Place {label.toLowerCase()} order · {taka(chosen.price * qty)}
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
