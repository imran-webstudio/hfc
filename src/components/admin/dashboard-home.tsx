"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Banknote, Check, CheckCircle2, ChevronDown, ChevronRight, Clock, Package, ShoppingBag, TrendingUp, UserMinus, Users, Wallet } from "lucide-react";
import { resumeCateringAction, setDayOffRangeAction } from "@/actions/admin-team";
import { useQueryParam } from "@/components/admin/filters";
import { useAct } from "@/components/ui/use-act";
import { cn } from "@/lib/cn";
import { taka } from "@/lib/money";
import { fmtDay, fmtShort } from "@/lib/time";

export type PackPerson = { orderId: string; name: string; floor: string | null; desk: string | null; quantity: number; status: string };

export type PackOfficeRow = { officeName: string; orders: number; portions: number; amount: number; people: PackPerson[] };

export type PackRow = {
  key: string;
  slot: string;
  title: string;
  imageUrl: string | null;
  orders: number;
  portions: number;
  amount: number;
  offices: PackOfficeRow[];
};

type Opt = { value: string; label: string };

export function DashboardHome({
  date,
  office,
  floor,
  offices,
  floors,
  lunchCutoff,
  dinnerCutoff,
  published,
  closed,
  partial,
  offToday,
  officeCount,
  note,
  offFrom,
  offTo,
  stats,
}: {
  date: string;
  office: string;
  floor: string;
  offices: Opt[];
  floors: Opt[];
  lunchCutoff: string;
  dinnerCutoff: string;
  published: boolean;
  closed: boolean;
  partial: boolean;
  offToday: number;
  officeCount: number;
  note: string | null;
  offFrom: string | null;
  offTo: string | null;
  stats: {
    todaysOrders: number;
    portions: number;
    delivered: number;
    pending: number;
    totalSales: number;
    cashPaid: number;
    creditBalance: number;
    activeUsers: number;
    usersWithDue: number;
    outstandingDue: number;
    pack: PackRow[];
  };
}) {
  const setParam = useQueryParam();
  const [dayOffOpen, setDayOffOpen] = useState(false);
  const cutoffLine = `Lunch cutoff ${lunchCutoff} · Dinner cutoff ${dinnerCutoff}${
    office === "all" ? " (All offices: earliest cutoff shown)" : ""
  }`;
  const range =
    offFrom && offTo ? (offFrom === offTo ? fmtDay(offFrom) : `${fmtShort(offFrom)} to ${fmtShort(offTo)}`) : fmtDay(date);
  const openTitle = `Catering is open — meal day ${fmtDay(date)}`;
  const offTitle = partial ? `Catering is partly off — ${offToday} of ${officeCount} offices` : `Catering is off — ${range}`;
  const subtitle = closed || partial ? note || "Members cannot place orders while catering is off." : cutoffLine;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 hidden lg:block">
        <h1 className="text-3xl font-semibold tracking-tight">Today, {fmtDay(date)}.</h1>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <ChipSelect label="Office / Building" value={office} options={[{ value: "all", label: "All offices" }, ...offices]} onChange={(v) => setParam("office", v)} />
        <ChipSelect label="Floor" value={floor} options={[{ value: "all", label: "All floors" }, ...floors]} onChange={(v) => setParam("floor", v)} />
        <span
          className={cn(
            "inline-flex h-11 items-center gap-2 rounded-full px-3.5 text-sm font-semibold",
            closed || partial ? "bg-ink/10 text-ink" : "bg-[#D4FF3A] text-[#0B0B0F]",
          )}
        >
          {closed || partial ? null : <Check className="h-4 w-4" strokeWidth={3} />}
          <span className="lg:hidden">{closed ? "Catering off" : partial ? "Partly off" : `Catering open · ${fmtShort(date)}`}</span>
          <span className="hidden lg:inline">{closed || partial ? offTitle : "Catering open"}</span>
        </span>
        {closed ? (
          <ResumeButton office={office} />
        ) : (
          <button type="button" className="btn btn-ghost h-11" onClick={() => setDayOffOpen(true)}>
            Take day off
          </button>
        )}
        {partial ? <ResumeButton office={office} /> : null}
        <p className="w-full text-xs leading-relaxed text-ink-muted">
          <span className="hidden lg:inline">{closed || partial ? offTitle : openTitle}. </span>
          {subtitle}
        </p>
      </div>

      <h2 className="mb-3 mt-2 text-[22px] font-extrabold tracking-tight">Today&apos;s Overview</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile label="Today's Orders" value={stats.todaysOrders} icon={<ShoppingBag className="h-[23px] w-[23px]" />} className="bg-[#5B4CF5] text-white" labelClass="text-white/85" />
        <StatTile label="Portions to Pack" value={stats.portions} icon={<Package className="h-[23px] w-[23px]" />} className="bg-[#0B0B0F] text-white dark:bg-[#1D1D22]" labelClass="text-white/70" />
        <StatTile label="Delivered" value={stats.delivered} icon={<CheckCircle2 className="h-[23px] w-[23px]" />} className="bg-[#E4F5E4]" labelClass="text-[#2E7D32]" valueClass="text-[#1E9E4A]" iconClass="text-[#1E9E4A]" />
        <StatTile label="Pending" value={stats.pending} icon={<Clock className="h-[23px] w-[23px]" />} className="bg-[#FBF0DC]" labelClass="text-[#B57E1E]" valueClass="text-[#D9930D]" iconClass="text-[#D9930D]" />
        <StatTile label="Total Cash Paid" value={taka(stats.cashPaid)} icon={<Banknote className="h-[23px] w-[23px]" />} className="bg-[#F2F2F4]" labelClass="text-[#55565C]" valueClass="text-[#111114]" iconClass="text-[#55565C]" />
        <StatTile label="Total Sale" value={taka(stats.totalSales)} icon={<TrendingUp className="h-[23px] w-[23px]" />} className="bg-[#5B4CF5] text-white" labelClass="text-white/85" />
      </div>

      <h2 className="mb-3 mt-7 text-[22px] font-extrabold tracking-tight">Account Overview</h2>
      <div className="space-y-3">
        <AccountRow href="/admin/users" label="Active Users" value={stats.activeUsers} icon={<Users className="h-[22px] w-[22px] text-white/60" />} className="bg-[#0B0B0F] text-white dark:bg-[#141417] dark:ring-1 dark:ring-white/10" chevronClass="text-white/35" />
        <AccountRow href="/admin/users?balance=due" label="Users with Due" value={stats.usersWithDue} icon={<UserMinus className="h-[22px] w-[22px] text-[#FF7A7A]" />} className="bg-[#0B0B0F] text-white dark:bg-[#141417] dark:ring-1 dark:ring-white/10" chevronClass="text-white/35" />
        <AccountRow href="/admin/users?balance=due" label="Outstanding Due" value={taka(stats.outstandingDue)} icon={<Wallet className="h-[22px] w-[22px] text-[#E03131]" />} className="bg-[#FDECEC]" labelClass="text-[#16161A]" valueClass="text-[#E03131]" chevronClass="text-[#C9A0A0]" />
        <AccountRow href="/admin/users?balance=credit" label="Credit Balance" value={taka(stats.creditBalance)} icon={<Wallet className="h-[22px] w-[22px] text-[#1E9E4A]" />} className="bg-[#E4F5E4]" labelClass="text-[#16161A]" valueClass="text-[#1E9E4A]" chevronClass="text-[#8FBF96]" />
      </div>
      <p className="mt-2 text-xs text-ink-muted">Tap any card above to open that customer list.</p>

      <section className="mt-6">
        <div className="mb-3 flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#5B4CF5]/10 text-[#5B4CF5]">
            <Package className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-display text-xl font-bold leading-tight">Pack by item</h2>
            <p className="text-xs text-ink-muted">Group by dish · Sorted by highest orders</p>
          </div>
        </div>
        {!published ? (
          <EmptyState title="No menus published for today yet" body="Publish lunch or dinner on the Menu page to start taking orders." />
        ) : stats.pack.length === 0 ? (
          <EmptyState title="There have been no orders today" body="Orders will show up here as soon as members place them." />
        ) : (
          <PackList items={stats.pack} />
        )}
      </section>

      <DayOffModal open={dayOffOpen} office={office} date={date} onClose={() => setDayOffOpen(false)} />
    </div>
  );
}

function StatTile({
  label,
  value,
  icon,
  className,
  labelClass,
  valueClass,
  iconClass,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  className?: string;
  labelClass?: string;
  valueClass?: string;
  iconClass?: string;
}) {
  return (
    <article className={cn("flex min-h-[132px] flex-col rounded-[1.25rem] p-4", className)}>
      <p className={cn("text-[15px] font-semibold", labelClass)}>{label}</p>
      <p className={cn("tnum mt-2 text-[38px] font-extrabold leading-none tracking-tight", valueClass)}>{value}</p>
      <span className={cn("mt-auto pt-3", iconClass)}>{icon}</span>
    </article>
  );
}

function AccountRow({
  href,
  label,
  value,
  icon,
  className,
  labelClass,
  valueClass,
  chevronClass,
}: {
  href: string;
  label: string;
  value: string | number;
  icon: ReactNode;
  className?: string;
  labelClass?: string;
  valueClass?: string;
  chevronClass?: string;
}) {
  return (
    <Link href={href} className={cn("flex items-center rounded-[1.25rem] px-[18px] py-4", className)}>
      <span>
        <span className={cn("block text-[17px] font-semibold", labelClass)}>{label}</span>
        <span className={cn("tnum mt-1 block text-[33px] font-extrabold leading-none tracking-tight", valueClass)}>{value}</span>
      </span>
      <span className="ml-auto flex flex-col items-end gap-3">
        {icon}
        <ChevronRight className={cn("h-5 w-5", chevronClass)} />
      </span>
    </Link>
  );
}

function PackList({ items }: { items: PackRow[] }) {
  const [openDish, setOpenDish] = useState<string | null>(null);
  const [openOffice, setOpenOffice] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      {items.map((row) => {
        const isOpen = openDish === row.key;
        const meal = row.slot === "LUNCH" ? "Lunch" : "Dinner";
        return (
          <div key={row.key} className="surface-card overflow-hidden rounded-3xl">
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
              aria-expanded={isOpen}
              onClick={() => setOpenDish(isOpen ? null : row.key)}
            >
              {row.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={row.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#5B4CF5]/10 font-display text-lg font-bold text-[#5B4CF5]">
                  {row.title.slice(0, 1)}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[15px] font-bold leading-snug">{row.title}</span>
                <span className="block truncate text-[13px] text-ink-muted">
                  {meal} · {row.orders} {row.orders === 1 ? "Order" : "Orders"}
                </span>
              </span>
              <span className="tnum shrink-0 rounded-full bg-leaf/15 px-2.5 py-1 text-xs font-bold text-leaf-deep">
                {row.portions} {row.portions === 1 ? "Portion" : "Portions"}
              </span>
              <ChevronDown className={cn("h-5 w-5 shrink-0 text-ink-muted transition", isOpen && "rotate-180")} />
            </button>
            {isOpen ? (
              <ul className="divide-y divide-line border-t border-line">
                {row.offices.map((office, idx) => {
                  const officeKey = `${row.key}|${office.officeName}`;
                  const officeOpen = openOffice === officeKey;
                  return (
                    <li key={officeKey}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 px-4 py-3 text-left"
                        aria-expanded={officeOpen}
                        onClick={() => setOpenOffice(officeOpen ? null : officeKey)}
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#5B4CF5]/10 font-display text-[13px] font-bold text-[#5B4CF5]">
                          {idx + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-[15px] font-semibold">{office.officeName}</span>
                            <span className="tnum shrink-0 text-[11px]">
                              <b>{office.orders}</b> <span className="text-ink-muted">{office.orders === 1 ? "Order" : "Orders"}</span>
                              {" · "}
                              <b>{office.portions}</b> <span className="text-ink-muted">{office.portions === 1 ? "Portion" : "Portions"}</span>
                            </span>
                          </span>
                          <span className="block text-xs text-ink-muted">Tap to view customers</span>
                        </span>
                        <ChevronRight className={cn("h-4 w-4 shrink-0 text-ink-muted transition", officeOpen && "rotate-90")} />
                      </button>
                      {officeOpen ? (
                        <ul className="space-y-1 bg-sand/60 px-4 py-3 pl-16 text-sm">
                          {office.people.map((person) => (
                            <li key={person.orderId} className="flex items-center justify-between gap-3">
                              <span>
                                <b>{person.name}</b>
                                <span className="text-ink-muted">
                                  {" "}
                                  · {[person.floor ? `Floor ${person.floor}` : null, person.desk ? `Desk ${person.desk}` : null].filter(Boolean).join(" · ") || office.officeName}
                                </span>
                              </span>
                              <span className="tnum text-ink-muted">× {person.quantity}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-line px-5 py-10 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-ink-muted">{body}</p>
    </div>
  );
}

function ResumeButton({ office }: { office: string }) {
  const { act, pending } = useAct();
  return (
    <button type="button" className="btn btn-primary h-11" disabled={pending} onClick={() => act(() => resumeCateringAction(office), { success: "Catering resumed" })}>
      Resume catering
    </button>
  );
}

function DayOffModal({ open, office, date, onClose }: { open: boolean; office: string; date: string; onClose: () => void }) {
  const { act, pending } = useAct();
  const [start, setStart] = useState(date);
  const [end, setEnd] = useState(date);
  const [note, setNote] = useState("");
  useEffect(() => {
    if (!open) return;
    setStart(date);
    setEnd(date);
    setNote("");
  }, [open, date]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  const invalid = end < start;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="dayoff-title">
      <button aria-label="Close dialog" className="absolute inset-0 bg-[#0B0B0F]/40" onClick={onClose} />
      <form
        className="relative w-full max-w-md rounded-3xl bg-rice p-5 shadow-[0_16px_40px_rgba(11,11,15,0.16)]"
        onSubmit={(e) => {
          e.preventDefault();
          if (invalid) return;
          act(() => setDayOffRangeAction(office, start, end, note), { success: "Day off saved", onOk: onClose });
        }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id="dayoff-title" className="text-lg font-semibold">
            Take day off
          </h2>
          <button type="button" onClick={onClose} className="text-sm text-ink-muted hover:text-ink" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="field-label">Start date</span>
            <input className="input" type="date" required value={start} onChange={(e) => setStart(e.target.value)} autoFocus />
          </label>
          <label className="block">
            <span className="field-label">End date</span>
            <input className="input" type="date" required value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
          </label>
        </div>
        <label className="mt-3 block">
          <span className="field-label">Note</span>
          <textarea className="input min-h-24 resize-y" placeholder="Office closed for public holiday" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
        </label>
        <p className="mt-2 text-xs text-ink-muted">Menus stay published, but members cannot place orders on these dates.</p>
        {invalid ? <p className="mt-2 text-xs text-[#E03131]">End date is before the start date.</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={pending || invalid}>
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

function ChipSelect({ label, value, options, onChange }: { label: string; value: string; options: Opt[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value)?.label ?? label;
  return (
    <div className="relative">
      <button type="button" className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-rice px-4 text-sm font-medium" onClick={() => setOpen(true)} aria-haspopup="listbox" aria-expanded={open}>
        {current}
        <ChevronDown className="h-4 w-4 text-ink-muted" />
      </button>
      {open ? (
        <>
          <button aria-label="Close" className="fixed inset-0 z-40 bg-[#0B0B0F]/40 lg:bg-transparent" onClick={() => setOpen(false)} />
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-3xl bg-rice p-3 shadow-2xl lg:absolute lg:inset-auto lg:bottom-auto lg:left-0 lg:top-full lg:mt-2 lg:max-h-80 lg:w-64 lg:rounded-2xl lg:ring-1 lg:ring-line" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }} role="listbox" aria-label={label}>
            <p className="px-3 py-2 text-sm font-semibold lg:sr-only">{label}</p>
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={o.value === value}
                className={cn("flex h-12 w-full items-center justify-between rounded-xl px-3 text-left text-sm", o.value === value && "bg-[#5B4CF5]/10 font-semibold text-[#5B4CF5]")}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                {o.label}
                {o.value === value ? <Check className="h-4 w-4" /> : null}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
