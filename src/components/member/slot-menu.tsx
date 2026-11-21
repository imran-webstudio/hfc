"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Ban,
  Banknote,
  CalendarDays,
  Check,
  CircleAlert,
  Clock,
  History,
  MapPin,
  Minus,
  Moon,
  Plus,
  Sun,
  TriangleAlert,
  UtensilsCrossed,
  Wallet,
  X,
} from "lucide-react";
import { cancelOrderAction, placeOrderAction } from "@/actions/member";
import { useAct } from "@/components/ui/use-act";
import { cn } from "@/lib/cn";
import { statusLabel } from "@/lib/labels";
import { signedTaka, taka } from "@/lib/money";
import { WEEKDAYS_SHORT } from "@/lib/time";

export type MenuItem = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  /** Availability ONLY — no numeric stock ever reaches the member UI (spec §5/§14.3). */
  available: boolean;
};
export type ExistingOrder = {
  id: string;
  title: string;
  quantity: number;
  itemCount: number;
  amount: number;
  status: string;
  paymentStatus: string;
  imageUrl: string | null;
};

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

/** Shown instead of the quantity selector when a dish's stock has run out. */
function UnavailablePill() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/[0.06] px-4 py-2 text-sm font-semibold text-ink-muted dark:bg-white/10">
      <Ban size={15} />
      Unavailable
    </span>
  );
}

const PILL = "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold";

function DeliveryPill({ status }: { status: string }) {
  if (status === "DELIVERED")
    return (
      <span className={`${PILL} bg-[#E7F7EE] text-[#1E9E5A] dark:bg-[#0F2A1D] dark:text-[#4ADE80]`}>
        <Check size={13} strokeWidth={3} />
        Delivered
      </span>
    );
  if (status === "PENDING")
    return (
      <span className={`${PILL} bg-[#FFF6E0] text-[#B97E0C] dark:bg-[#2A2108] dark:text-[#FFD54D]`}>
        <Clock size={13} strokeWidth={2.6} />
        Pending
      </span>
    );
  return <span className={`${PILL} bg-ink/[0.06] text-ink-muted dark:bg-white/10`}>{statusLabel(status)}</span>;
}

function PaymentPill({ status }: { status: string }) {
  if (status === "CASH_PAID")
    return (
      <span className={`${PILL} bg-[#E7F7EE] text-[#1E9E5A] dark:bg-[#0F2A1D] dark:text-[#4ADE80]`}>
        <Banknote size={13} />
        Cash Paid
      </span>
    );
  if (status === "WALLET_CHARGED")
    return (
      <span className={`${PILL} bg-[#5B4CF5]/10 text-[#5B4CF5] dark:bg-[#5B4CF5]/20 dark:text-[#C8C2FF]`}>
        <Wallet size={13} />
        Wallet Charge
      </span>
    );
  return (
    <span className={`${PILL} bg-[#FFF3E0] text-[#E8890C] dark:bg-[#2A1E08] dark:text-[#FFB74D]`}>
      <CircleAlert size={13} />
      Unpaid
    </span>
  );
}

/** Short label for a closed slot's header pill (the full reason sits under it). */
function closedShort(reason?: string) {
  if (!reason) return "Closed";
  if (reason.includes("off")) return "Catering Off";
  if (reason.includes("not offered")) return "Not Offered";
  if (reason.includes("not active")) return "Inactive";
  if (reason.includes("office in Profile")) return "No Office";
  return "Closed";
}

function SlotBox({
  s,
  weekday,
  isStaff,
  cart,
  setQty,
}: {
  s: FoodSlot;
  weekday: number;
  isStaff: boolean;
  cart: Record<string, number>;
  setQty: (id: string, qty: number) => void;
}) {
  const name = s.slot === "LUNCH" ? "Lunch" : "Dinner";
  const Icon = s.slot === "LUNCH" ? Sun : Moon;
  const hasMenu = s.items.length > 0;
  return (
    <section className="rounded-[1.6rem] border border-line bg-rice p-4 shadow-[var(--hfc-card-shadow)] sm:p-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <Icon className="h-6 w-6 text-[#5B4CF5]" strokeWidth={2.2} />
        <h2 className="text-[22px] font-extrabold tracking-tight">{name}</h2>
        <span className="ml-auto">
          {!hasMenu ? (
            <span className={`${PILL} bg-[#FDECEC] text-[12px] text-[#E03131] dark:bg-[#2B1216] dark:text-[#FF7A7A]`}>
              <Ban size={13} />
              No Menu
            </span>
          ) : s.open && s.closesLabel ? (
            <span className={`${PILL} bg-[#E7F7EE] text-[12px] text-[#1E9E5A] dark:bg-[#0F2A1D] dark:text-[#4ADE80]`}>
              <Clock size={13} strokeWidth={2.6} />
              {s.closesLabel}
            </span>
          ) : !s.open ? (
            <span className={`${PILL} bg-ink/[0.06] text-[12px] text-ink-muted dark:bg-white/10`}>{closedShort(s.reason)}</span>
          ) : null}
        </span>
      </div>
      {/* Cutoff/closed information only exists when a menu is set (per design rule). */}
      {hasMenu && !s.open && s.reason ? <p className="mt-1.5 text-sm text-ink-muted">{s.reason}</p> : null}

      {!hasMenu ? (
        <div className="py-5 text-center">
          <p className="text-[15px] text-ink-muted">No {name.toLowerCase()} menu added yet.</p>
          {isStaff ? (
            <Link
              href={`/admin/menu?day=${weekday}&slot=${s.slot}`}
              className="mt-3.5 inline-flex items-center gap-1.5 rounded-full border-2 border-[#5B4CF5]/50 px-5 py-2 text-[15px] font-bold text-[#5B4CF5] transition hover:bg-[#5B4CF5]/5"
            >
              <Plus size={17} strokeWidth={2.6} />
              Add {name} Menu
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 lg:gap-4">
          {s.items.map((it) => {
            const qty = cart[it.id] ?? 0;
            return (
              <li key={it.id} className="rounded-[1.25rem] border border-line/70 p-2.5">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[0.9rem] bg-[#E7E7E4] dark:bg-[#14141C]">
                  <DishPhoto src={it.imageUrl} alt="" sizes="(min-width:1024px) 280px, 45vw" />
                  {!it.available ? (
                    <span className="absolute right-2 top-2 rounded-full bg-[#E03131] px-2.5 py-1 text-[11px] font-bold text-white shadow">Stock Out</span>
                  ) : null}
                </div>
                <p className="mt-2.5 line-clamp-2 text-[16px] font-bold leading-snug">{it.title}</p>
                <p className="tnum mt-0.5 text-[15px] font-extrabold text-[#5B4CF5]">{taka(it.price)}</p>
                <div className="mt-2">{!it.available ? <UnavailablePill /> : <Stepper qty={qty} disabled={!s.open} onQty={(q) => setQty(it.id, q)} label={it.title} />}</div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function OrderFood({
  dayName,
  fullDate,
  isToday,
  weekday,
  isStaff,
  date,
  place,
  cateringOff,
  offNote,
  balance,
  slots,
  existing,
}: {
  dayName: string;
  fullDate: string;
  isToday: boolean;
  weekday: number;
  isStaff: boolean;
  date: string;
  place: string;
  cateringOff: boolean;
  offNote: string | null;
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

  return (
    <div className={cateringOff ? "pb-24 lg:pb-0" : "pb-24 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8 lg:pb-0"}>
      <div>
        <div className="px-0.5">
          <h1 className="text-[26px] font-extrabold tracking-tight">{isToday ? "Today's Meal" : `${dayName}'s Meal`}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-[15px] text-ink-muted">
            <CalendarDays size={16} className="text-[#5B4CF5]" />
            {dayName} • {fullDate}
          </p>
        </div>

        {cateringOff ? (
          <ServiceOff note={offNote} />
        ) : (
          <div className="mt-5 space-y-5">
            {slots.map((s) => (
              <SlotBox key={s.slot} s={s} weekday={weekday} isStaff={isStaff} cart={cart} setQty={setQty} />
            ))}
          </div>
        )}

        {existing.length > 0 ? (
          <section className="mt-8">
            <div className="mb-3 flex items-center gap-2 px-0.5">
              <History className="h-5 w-5 text-[#5B4CF5]" />
              <h2 className="text-lg font-extrabold tracking-tight">Recently Ordered</h2>
              <Link href="/app/orders" className="ml-auto inline-flex items-center gap-1 text-sm font-bold text-[#5B4CF5]">
                View All
                <ArrowRight size={15} />
              </Link>
            </div>
            <ul className="space-y-2.5">
              {existing.map((o) => (
                <li key={o.id} className="flex items-center gap-3 rounded-[1.25rem] border border-line bg-rice p-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#E7E7E4] dark:bg-[#14141C]">
                    <DishPhoto src={o.imageUrl} alt="" compact sizes="56px" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold">{o.itemCount === 1 ? `${o.title} × ${o.quantity}` : o.title}</p>
                    <p className="mt-0.5 whitespace-nowrap text-xs text-ink-muted">
                      Order #{o.id.slice(-6).toUpperCase()} • {WEEKDAYS_SHORT[weekday]}
                    </p>
                    <p className="tnum mt-0.5 text-[15px] font-extrabold text-[#5B4CF5]">{taka(o.amount)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <DeliveryPill status={o.status} />
                    <PaymentPill status={o.paymentStatus} />
                    {o.status === "PENDING" ? (
                      <button
                        className="text-xs font-semibold text-[#E03131] disabled:opacity-50"
                        disabled={pending}
                        onClick={() => act(() => cancelOrderAction(o.id), { success: "Order cancelled" })}
                      >
                        Cancel order
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      {cateringOff ? null : (
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
              <span>Balance after delivery</span>
              <span className="tnum">{signedTaka(after)}</span>
            </div>
          ) : null}
        </div>
        <button className="btn cta mt-4 h-12 w-full" disabled={pending || !lines.length} onClick={placeOrder}>
          Place order{lines.length ? ` · ${taka(total)}` : ""}
        </button>
      </aside>
      )}

      {lines.length ? (
        <div
          className="fixed inset-x-0 z-30 mx-auto flex w-[min(100%-1rem,520px)] items-center gap-2 rounded-full bg-[#0B0B0F] px-2 py-2 text-white shadow-xl lg:hidden"
          style={{ bottom: "calc(max(0.75rem, env(safe-area-inset-bottom)) + 5rem)" }}
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#3DDC97] text-sm font-bold text-[#0B0B0F]">{totalQty}</span>
          <span className="min-w-0 flex-1 truncate text-sm">
            {lines.length} item{lines.length > 1 ? "s" : ""} · <span className="tnum">{taka(total)}</span>
          </span>
          <span className="tnum shrink-0 text-[11px] font-semibold text-[#FF8A8A]">After delivery {signedTaka(after)}</span>
          <button className="btn cta h-10 shrink-0 rounded-full px-3 text-sm" disabled={pending} onClick={placeOrder}>
            Place order
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Cloche with a prohibition badge — the "service off" illustration from the reference design. */
function ClocheOffArt() {
  return (
    <svg viewBox="0 0 220 150" className="mx-auto w-52 max-w-full" role="img" aria-label="Catering service off">
      <g stroke="#9AA0AE" strokeWidth="7" strokeLinecap="round">
        <line x1="16" y1="62" x2="42" y2="52" />
        <line x1="12" y1="88" x2="40" y2="88" />
        <line x1="178" y1="52" x2="204" y2="62" />
        <line x1="180" y1="88" x2="208" y2="88" />
      </g>
      <rect x="103" y="38" width="14" height="10" rx="4" className="fill-[#B9BEC9] dark:fill-[#8B919D]" />
      <circle cx="110" cy="34" r="8" className="fill-[#C7CBD4] dark:fill-[#9BA1AD]" />
      <path d="M55 108 A55 52 0 0 1 165 108 Z" className="fill-[#C7CBD4] dark:fill-[#9BA1AD]" />
      <path d="M78 74 A38 38 0 0 1 104 60" fill="none" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="7" strokeLinecap="round" />
      <rect x="44" y="112" width="132" height="8" rx="4" className="fill-[#AEB3BE] dark:fill-[#787E8A]" />
      <g fill="none" stroke="#E03131" strokeWidth="10">
        <circle cx="160" cy="112" r="23" />
        <line x1="143" y1="95" x2="177" y2="129" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/** Day-off state for the member home: amber Service Notice banner with the admin's note, then the off illustration. */
function ServiceOff({ note }: { note: string | null }) {
  return (
    <div className="mt-5">
      <div className="flex items-stretch gap-4 rounded-[1.6rem] border border-[#F0B429]/70 bg-gradient-to-br from-[#FFF6D8] to-[#FFEFC0] p-4 dark:border-[#8A6D1A] dark:from-[#3A2C07] dark:to-[#241B04] sm:p-5">
        <div className="flex items-center border-r border-[#F0B429]/50 pr-4 dark:border-[#8A6D1A]/70">
          <TriangleAlert className="h-10 w-10 shrink-0 fill-[#FFC727] text-[#3D2E06]" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-extrabold tracking-tight text-[#B97E0C] dark:text-[#FFC727]">Service Notice</h2>
            <span className="shrink-0 rounded-full bg-[#FFC727] px-3 py-1 text-xs font-bold text-[#3D2E06]">Catering Off</span>
          </div>
          {note ? <p className="mt-1.5 text-[15px] leading-relaxed text-[#6B5410] dark:text-[#F0D48A]">{note}</p> : null}
        </div>
      </div>
      <div className="px-4 py-12 text-center">
        <ClocheOffArt />
        <h2 className="mt-7 text-[26px] font-extrabold leading-tight tracking-tight">Catering Service is Currently Off</h2>
        <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-ink-muted">
          We apologize for the inconvenience.
          <br />
          Please check again tomorrow.
        </p>
      </div>
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
