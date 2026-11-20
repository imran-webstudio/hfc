"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { MapPin, Minus, Plus, UtensilsCrossed, X } from "lucide-react";
import { cancelOrderAction, placeOrderAction } from "@/actions/member";
import { useAct } from "@/components/ui/use-act";
import { cn } from "@/lib/cn";
import { statusLabel } from "@/lib/labels";
import { signedTaka, taka } from "@/lib/money";
import { todayStr } from "@/lib/time";

export type MenuItem = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  /** Availability ONLY — no numeric stock ever reaches the member UI (spec §5/§14.3). */
  available: boolean;
};
export type ExistingOrder = { id: string; title: string; quantity: number; amount: number; status: string };

export type FoodSlot = {
  slot: "LUNCH" | "DINNER";
  cutoff: string;
  open: boolean;
  reason?: string;
  closesLabel: string | null;
  items: MenuItem[];
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

function Stepper({
  qty,
  disabled,
  onQty,
  label,
}: {
  qty: number;
  disabled: boolean;
  onQty: (q: number) => void;
  label: string;
}) {
  return (
    <div className={cn("inline-flex items-center gap-3 rounded-full border border-line px-1.5 py-1", disabled && "opacity-40")}>
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        disabled={disabled || qty <= 0}
        onClick={() => onQty(qty - 1)}
        className="grid h-7 w-7 place-items-center rounded-full border border-line disabled:opacity-40"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="tnum w-4 text-center text-[15px] font-bold">{qty}</span>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        disabled={disabled || qty >= 20}
        onClick={() => onQty(qty + 1)}
        className="grid h-7 w-7 place-items-center rounded-full bg-[#5B4CF5] text-white disabled:opacity-40"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function StockOutPill() {
  return <span className="inline-block rounded-full bg-ink/10 px-3 py-1.5 text-[13px] font-semibold text-ink-muted dark:bg-white/10">Stock Out</span>;
}

export function OrderFood({
  dayName,
  date,
  place,
  balance,
  slots,
  existing,
}: {
  dayName: string;
  date: string;
  place: string;
  balance: number;
  slots: FoodSlot[];
  existing: ExistingOrder[];
}) {
  const { act, pending } = useAct();
  // One cart for the whole checkout: dishes from lunch AND dinner in a single order (spec §14.1).
  const [cart, setCart] = useState<Record<string, number>>({});
  const allItems = useMemo(() => slots.flatMap((s) => s.items), [slots]);
  const lines = allItems.filter((i) => (cart[i.id] ?? 0) > 0).map((i) => ({ item: i, qty: cart[i.id], subtotal: i.price * cart[i.id] }));
  const total = lines.reduce((s, l) => s + l.subtotal, 0);
  const totalQty = lines.reduce((s, l) => s + l.qty, 0);
  const after = balance - total;

  const setQty = (id: string, qty: number) =>
    setCart((c) => {
      const next = { ...c };
      if (qty <= 0) delete next[id];
      else next[id] = Math.min(20, qty);
      return next;
    });

  const placeOrder = () =>
    act(() => placeOrderAction({ items: lines.map((l) => ({ optionId: l.item.id, quantity: l.qty })), date }), {
      success: `Order placed — ${taka(total)}`,
      onOk: () => setCart({}),
    });

  if (!slots.length) return <EmptyMenu />;

  const isToday = date === todayStr();
  // The card at the top features the slot a member would order from right now:
  // the first open slot with dishes, else the first slot that has any.
  const featured = slots.find((s) => s.open && s.items.length > 0) ?? slots.find((s) => s.items.length > 0) ?? slots[0];
  const featuredName = featured.slot === "LUNCH" ? "Lunch" : "Dinner";

  return (
    <div className="pb-24 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8 lg:pb-0">
      <div>
        <section className="rounded-[1.6rem] border border-line bg-rice p-4 shadow-[var(--hfc-card-shadow)] sm:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[26px] font-extrabold tracking-tight">{isToday ? "Today's Meal" : `${dayName}'s Meal`}</h1>
            {featured.closesLabel ? <span className="rounded-full bg-[#5B4CF5] px-3 py-1 text-xs font-semibold text-white">{featured.closesLabel}</span> : null}
          </div>
          <p className="mt-1 text-[15px] text-ink-muted">
            {dayName} • {featuredName}
            {!featured.open && featured.reason ? ` · ${featured.reason}` : ""}
          </p>
          {featured.items.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-muted">No {featuredName.toLowerCase()} menu added yet.</p>
          ) : (
            <ul className="mt-4 grid grid-cols-2 gap-3 lg:gap-4">
              {featured.items.map((it) => {
                const qty = cart[it.id] ?? 0;
                return (
                  <li key={it.id}>
                    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[#E7E7E4] dark:bg-[#14141C]">
                      <DishPhoto src={it.imageUrl} alt="" sizes="(min-width:1024px) 280px, 45vw" />
                    </div>
                    <p className="mt-2.5 line-clamp-2 text-[17px] font-bold leading-snug">{it.title}</p>
                    <p className="tnum mt-0.5 text-[15px] text-ink-muted">{taka(it.price)}</p>
                    <div className="mt-2">
                      {!it.available ? <StockOutPill /> : <Stepper qty={qty} disabled={!featured.open} onQty={(q) => setQty(it.id, q)} label={it.title} />}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {slots.map((s) => {
          const name = s.slot === "LUNCH" ? "Lunch" : "Dinner";
          return (
            <section key={s.slot} className="mt-7">
              <div className="mb-3 flex flex-wrap items-center gap-3 px-0.5">
                <h2 className="text-xl font-extrabold tracking-tight">{name}</h2>
                {s.closesLabel ? <span className="rounded-full bg-[#5B4CF5]/10 px-2.5 py-1 text-[11px] font-semibold text-[#5B4CF5]">{s.closesLabel}</span> : null}
                {!s.open && s.reason ? <span className="text-sm text-ink-muted">{s.reason}</span> : null}
              </div>
              {s.items.length === 0 ? (
                <p className="px-0.5 text-[15px] text-ink-muted">No {name.toLowerCase()} menu added yet.</p>
              ) : (
                <ul className="space-y-2.5">
                  {s.items.map((it) => {
                    const qty = cart[it.id] ?? 0;
                    return (
                      <li key={it.id} className="flex items-center gap-3 rounded-[1.1rem] border border-line bg-rice px-3 py-2.5">
                        <div className="relative h-[58px] w-[58px] shrink-0 overflow-hidden rounded-[13px] bg-[#E7E7E4] dark:bg-[#14141C]">
                          <DishPhoto src={it.imageUrl} alt="" compact sizes="58px" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-bold">{it.title}</p>
                          <p className="tnum text-sm text-ink-muted">{taka(it.price)}</p>
                        </div>
                        {!it.available ? <StockOutPill /> : <Stepper qty={qty} disabled={!s.open} onQty={(q) => setQty(it.id, q)} label={it.title} />}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}

        {existing.map((o) => (
          <div key={o.id} className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-line bg-rice px-4 py-3">
            <p className="text-sm">
              <span className="font-semibold">{o.title}</span>
              <span className="text-ink-muted"> ×{o.quantity}</span>
              <span className="ml-2 text-xs text-ink-muted">{statusLabel(o.status)}</span>
            </p>
            {o.status === "PENDING" ? (
              <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => act(() => cancelOrderAction(o.id), { success: "Order cancelled" })}>
                Cancel
              </button>
            ) : null}
          </div>
        ))}
      </div>

      <aside className="mt-6 hidden rounded-[1.6rem] border border-line bg-rice p-5 shadow-[var(--hfc-card-shadow)] lg:block">
        <h2 className="text-lg font-semibold">Your order</h2>
        {lines.length ? (
          <ul className="mt-4 space-y-3">
            {lines.map(({ item, qty, subtotal }) => (
              <li key={item.id} className="flex items-center gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#E7E7E4] dark:bg-[#14141C]">
                  <DishPhoto src={item.imageUrl} alt="" compact />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{item.title}</p>
                  <p className="text-sm text-ink-muted">×{qty}</p>
                </div>
                <p className="tnum font-semibold">{taka(subtotal)}</p>
                <button type="button" aria-label={`Remove ${item.title}`} className="text-ink-muted hover:text-ink" onClick={() => setQty(item.id, 0)}>
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-ink-muted">Use the + buttons to build one order — lunch and dinner can go together.</p>
        )}
        {place ? (
          <p className="mt-4 flex items-start gap-2 rounded-2xl bg-[#F4F1FF] px-3 py-2 text-sm dark:bg-[#1c1a2e]">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#5B4CF5]" />
            <span>{place}</span>
          </p>
        ) : null}
        <div className="mt-4 space-y-1 text-sm">
          <div className="flex justify-between text-base font-semibold">
            <span>Grand total</span>
            <span className="tnum">{taka(total)}</span>
          </div>
          {lines.length ? (
            <div className="flex justify-between text-[#E03131]">
              <span>Balance after order</span>
              <span className="tnum">{signedTaka(after)}</span>
            </div>
          ) : null}
        </div>
        <button className="btn cta mt-4 h-12 w-full" disabled={pending || !lines.length} onClick={placeOrder}>
          Place order{lines.length ? ` · ${taka(total)}` : ""}
        </button>
      </aside>

      {lines.length ? (
        <div
          className="fixed inset-x-0 z-30 mx-auto flex w-[min(100%-1rem,520px)] items-center gap-2 rounded-full bg-[#0B0B0F] px-2 py-2 text-white shadow-xl lg:hidden"
          style={{ bottom: "calc(max(0.75rem, env(safe-area-inset-bottom)) + 5rem)" }}
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#3DDC97] text-sm font-bold text-[#0B0B0F]">{totalQty}</span>
          <span className="min-w-0 flex-1 truncate text-sm">
            {lines.length} item{lines.length > 1 ? "s" : ""} · <span className="tnum">{taka(total)}</span>
          </span>
          <span className="tnum shrink-0 text-[11px] font-semibold text-[#FF8A8A]">Balance after {signedTaka(after)}</span>
          <button className="btn cta h-10 shrink-0 rounded-full px-3 text-sm" disabled={pending} onClick={placeOrder}>
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
