"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { MapPin, Minus, Plus, UtensilsCrossed } from "lucide-react";
import { cancelOrderAction, placeOrderAction } from "@/actions/member";
import { useAct } from "@/components/ui/use-act";
import { cn } from "@/lib/cn";
import { statusLabel } from "@/lib/labels";
import { signedTaka, taka } from "@/lib/money";

export type MenuItem = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  remaining: number | null;
};
export type ExistingOrder = { id: string; title: string; quantity: number; amount: number; status: string; imageUrl?: string | null };

export type FoodSlot = {
  slot: "LUNCH" | "DINNER";
  cutoff: string;
  open: boolean;
  reason?: string;
  closesLabel: string | null;
  items: MenuItem[];
  existing: ExistingOrder | null;
};

function DishPlaceholder({ compact = false }: { compact?: boolean }) {
  return (
    <div className="absolute inset-0" aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-br from-[#E4E0FF] via-[#F6F6F2] to-[#DDF4F0] dark:from-[#1C1C28] dark:via-[#14141C] dark:to-[#12161A]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_20%,rgba(91,76,245,0.38),transparent_46%),radial-gradient(circle_at_82%_78%,rgba(212,255,58,0.42),transparent_42%),radial-gradient(circle_at_68%_32%,rgba(20,184,166,0.28),transparent_40%)] dark:bg-[radial-gradient(circle_at_24%_20%,rgba(91,76,245,0.32),transparent_48%),radial-gradient(circle_at_84%_80%,rgba(212,255,58,0.14),transparent_42%),radial-gradient(circle_at_68%_32%,rgba(20,184,166,0.18),transparent_40%)]" />
      <div className={cn("absolute inset-0 grid place-items-center text-[#5B4CF5]/50 dark:text-[#C8C2FF]/40", compact ? "" : "pb-14")}>
        <UtensilsCrossed className={compact ? "h-5 w-5" : "h-9 w-9"} strokeWidth={1.4} />
      </div>
    </div>
  );
}

function DishPhoto({ src, alt, sizes, compact = false }: { src: string | null; alt: string; sizes?: string; compact?: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) return <DishPlaceholder compact={compact} />;
  return <Image src={src} alt={alt} fill unoptimized className="object-cover" sizes={sizes} onError={() => setFailed(true)} />;
}

export function OrderFood({
  dayName,
  date,
  place,
  balance,
  slots,
}: {
  dayName: string;
  date: string;
  place: string;
  balance: number;
  slots: FoodSlot[];
}) {
  const { act, pending } = useAct();
  const [slotId, setSlotId] = useState<"LUNCH" | "DINNER">(slots[0]?.slot ?? "LUNCH");
  const [selected, setSelected] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const slot = slots.find((s) => s.slot === slotId) ?? slots[0];
  const chosen = slot?.items.find((i) => i.id === selected) ?? null;
  const total = chosen ? chosen.price * qty : 0;
  const after = balance - total;
  const empty = useMemo(() => slots.every((s) => s.items.length === 0 && !s.existing), [slots]);

  if (!slot) {
    return <EmptyMenu />;
  }

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8">
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">
              {dayName} {slot.slot === "LUNCH" ? "lunch" : "dinner"}
            </h1>
            {slot.closesLabel ? <span className="rounded-full bg-[#5B4CF5] px-3 py-1 text-xs font-semibold text-white">{slot.closesLabel}</span> : null}
            {!slot.open && slot.reason ? <span className="text-sm text-ink-muted">{slot.reason}</span> : null}
          </div>
          {slots.length > 1 ? (
            <div className="grid w-full grid-cols-2 gap-2 rounded-2xl bg-rice p-1 ring-1 ring-line sm:flex sm:w-auto">
              {slots.map((s) => (
                <button
                  key={s.slot}
                  type="button"
                  onClick={() => {
                    setSlotId(s.slot);
                    setSelected(null);
                    setQty(1);
                  }}
                  className={cn("h-11 rounded-xl px-5 text-sm font-semibold", slot.slot === s.slot ? "bg-white shadow-sm dark:bg-[#17171F]" : "text-ink-muted")}
                >
                  {s.slot === "LUNCH" ? "Lunch" : "Dinner"}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {empty || slot.items.length === 0 ? (
          <EmptyMenu />
        ) : (
          <ul className="grid grid-cols-2 gap-3 lg:gap-4">
            {slot.items.map((it) => {
              const on = selected === it.id;
              const max = it.remaining == null ? 20 : Math.min(20, it.remaining);
              return (
                <li key={it.id} className="relative aspect-square overflow-hidden rounded-[1.4rem] bg-[#E7E7E4] dark:bg-[#14141C]">
                  <DishPhoto src={it.imageUrl} alt="" sizes="(min-width:1024px) 280px, 45vw" />
                  {it.remaining != null ? (
                    <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-ink">{it.remaining} left</span>
                  ) : null}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/45 to-transparent p-3 pt-10 text-white">
                    <p className="line-clamp-2 text-sm font-semibold leading-tight">{it.title}</p>
                    <div className="mt-1 flex items-end justify-between gap-2">
                      <p className="tnum text-sm font-semibold">{taka(it.price)}</p>
                      {on ? (
                        <div className="flex items-center rounded-full bg-[#5B4CF5] text-white">
                          <button type="button" aria-label="Decrease" className="grid h-8 w-8 place-items-center" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-4 text-center text-sm font-bold">{qty}</span>
                          <button type="button" aria-label="Increase" className="grid h-8 w-8 place-items-center" disabled={qty >= max} onClick={() => setQty((q) => Math.min(max, q + 1))}>
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          aria-label={`Add ${it.title}`}
                          disabled={!slot.open || it.remaining === 0}
                          onClick={() => {
                            setSelected(it.id);
                            setQty(1);
                          }}
                          className="grid h-8 w-8 place-items-center rounded-full bg-[#5B4CF5] text-white disabled:opacity-40"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {slot.existing ? (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-line bg-rice px-4 py-3">
            <p className="text-sm">
              <span className="font-semibold">{slot.existing.title}</span>
              <span className="text-ink-muted"> ×{slot.existing.quantity}</span>
              <span className="ml-2 text-xs text-ink-muted">{statusLabel(slot.existing.status)}</span>
            </p>
            {slot.existing.status === "PENDING" ? (
              <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => act(() => cancelOrderAction(slot.existing!.id), { success: "Order cancelled" })}>
                Cancel
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <aside className="mt-6 hidden rounded-[1.6rem] border border-line bg-rice p-5 shadow-[var(--hfc-card-shadow)] lg:block">
        <h2 className="text-lg font-semibold">Your order</h2>
        {chosen ? (
          <div className="mt-4 flex items-center gap-3">
            <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-[#E7E7E4] dark:bg-[#14141C]">
              <DishPhoto src={chosen.imageUrl} alt="" compact />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{chosen.title}</p>
              <p className="text-sm text-ink-muted">×{qty}</p>
            </div>
            <p className="tnum font-semibold">{taka(total)}</p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink-muted">Tap + on a dish to add it.</p>
        )}
        {place ? (
          <p className="mt-4 flex items-start gap-2 rounded-2xl bg-[#F4F1FF] px-3 py-2 text-sm dark:bg-[#1c1a2e]">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#5B4CF5]" />
            <span>{place}</span>
          </p>
        ) : null}
        <div className="mt-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-muted">Subtotal</span>
            <span className="tnum">{taka(total)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <span>Total</span>
            <span className="tnum">{taka(total)}</span>
          </div>
          {chosen ? (
            <div className="flex justify-between text-[#E03131]">
              <span>Wallet after order</span>
              <span className="tnum">{signedTaka(after)}</span>
            </div>
          ) : null}
        </div>
        <button
          className="btn cta mt-4 h-12 w-full"
          disabled={pending || !chosen || !slot.open}
          onClick={() => chosen && act(() => placeOrderAction({ optionId: chosen.id, date, quantity: qty }), { success: `Order placed — ${taka(total)}`, onOk: () => setSelected(null) })}
        >
          Place order{chosen ? ` · ${taka(total)}` : ""}
        </button>
      </aside>

      {chosen && slot.open ? (
        <div className="fixed inset-x-0 z-30 mx-auto flex w-[min(100%-1rem,520px)] items-center gap-2 rounded-full bg-[#0B0B0F] px-2 py-2 text-white shadow-xl lg:hidden" style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#3DDC97] text-sm font-bold text-[#0B0B0F]">{qty}</span>
          <span className="min-w-0 flex-1 truncate text-sm">
            {chosen.title} · <span className="tnum">{taka(total)}</span>
          </span>
          <span className="tnum shrink-0 text-[11px] font-semibold text-[#FF8A8A]">Wallet after {signedTaka(after)}</span>
          <button
            className="btn cta h-10 shrink-0 rounded-full px-3 text-sm"
            disabled={pending}
            onClick={() => act(() => placeOrderAction({ optionId: chosen.id, date, quantity: qty }), { success: `Order placed — ${taka(total)}`, onOk: () => setSelected(null) })}
          >
            Place order
          </button>
        </div>
      ) : null}
    </div>
  );
}

function EmptyMenu() {
  return (
    <div className="px-4 py-16 text-center">
      <div className="mx-auto mb-3 h-12 w-16 rounded-b-full border-2 border-ink/70 border-t-0" aria-hidden />
      <p className="text-lg font-semibold">No dishes yet</p>
      <p className="mx-auto mt-1 max-w-xs text-sm text-ink-muted">Today’s menu will appear here when it’s published. Pull to refresh.</p>
    </div>
  );
}
