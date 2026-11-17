"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Banknote, Check, ChevronDown, ShoppingBag, TrendingUp, Users, Wallet } from "lucide-react";
import { resumeCateringAction, setDayOffRangeAction } from "@/actions/admin-team";
import { useQueryParam } from "@/components/admin/filters";
import { useAct } from "@/components/ui/use-act";
import { cn } from "@/lib/cn";
import { taka } from "@/lib/money";
import { fmtDay, fmtShort } from "@/lib/time";

export type PackRow = {
  key: string;
  slot: string;
  title: string;
  officeName: string;
  imageUrl: string | null;
  orders: number;
  portions: number;
  amount: number;
  people: { orderId: string; name: string; floor: string | null; desk: string | null; quantity: number; status: string }[];
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
  const total = stats.pending + stats.delivered;
  const cutoffLine = `Lunch cutoff ${lunchCutoff} · Dinner cutoff ${dinnerCutoff}${
    office === "all" ? " (All offices: earliest cutoff shown)" : ""
  }`;
  const range =
    offFrom && offTo ? (offFrom === offTo ? fmtDay(offFrom) : `${fmtShort(offFrom)} to ${fmtShort(offTo)}`) : fmtDay(date);
  const openTitle = `Catering is open — meal day ${fmtDay(date)}`;
  const offTitle = partial ? `Catering is partly off — ${offToday} of ${officeCount} offices` : `Catering is off — ${range}`;
  const subtitle = closed || partial ? note || "Members cannot place orders while catering is off." : cutoffLine;

  const byTitle = new Map<string, number>();
  for (const row of stats.pack) byTitle.set(row.title, (byTitle.get(row.title) ?? 0) + row.portions);
  const bars = [...byTitle.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const barMax = bars[0]?.[1] || 1;

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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <article className="relative col-span-2 flex min-h-[168px] items-center justify-between overflow-hidden rounded-3xl bg-[#5B4CF5] p-5 text-white lg:col-span-1">
          <div>
            <p className="text-sm font-medium text-white/80">Pending to deliver</p>
            <p className="mt-1 text-4xl font-semibold tracking-tight lg:hidden">
              {stats.pending} of {total}
            </p>
            <p className="mt-1 hidden text-5xl font-semibold tracking-tight lg:block">{stats.pending}</p>
            <p className="mt-3 text-sm text-white/80 lg:hidden">Track today&apos;s delivery progress</p>
            <p className="mt-3 hidden text-sm text-white/80 lg:block">
              {stats.delivered} of {total} delivered
            </p>
          </div>
          <ProgressRing delivered={stats.delivered} total={total} />
        </article>

        <article className="flex min-h-[168px] flex-col justify-between rounded-3xl bg-[#0B0B0F] p-5 text-white dark:bg-[#14141C] dark:ring-1 dark:ring-white/10">
          <p className="text-sm font-medium text-white/70">Portions to pack</p>
          <p className="text-4xl font-semibold tracking-tight">{stats.portions}</p>
          {bars.length ? (
            <ul className="mt-3 hidden space-y-1.5 lg:block">
              {bars.map(([title, n]) => (
                <li key={title} className="grid grid-cols-[1fr_auto] items-center gap-2 text-xs">
                  <span className="truncate text-white/80">{title}</span>
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-16 overflow-hidden rounded-full bg-white/15">
                      <span className="block h-full rounded-full bg-[#D4FF3A]" style={{ width: `${Math.max(8, (n / barMax) * 100)}%` }} />
                    </span>
                    <span className="tnum w-5 text-right">{n}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </article>

        <article className="flex min-h-[168px] flex-col justify-between rounded-3xl bg-[#D4FF3A] p-5 text-[#0B0B0F]">
          <p className="text-sm font-medium">Outstanding due</p>
          <div>
            <p className="tnum text-4xl font-semibold tracking-tight">{taka(stats.outstandingDue)}</p>
            <p className="mt-1 text-sm lg:hidden">({stats.usersWithDue} users)</p>
            <p className="mt-1 hidden text-sm lg:block">{stats.usersWithDue} users with due</p>
          </div>
        </article>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 min-[400px]:grid-cols-3 lg:grid-cols-6">
        <Tile className="hidden lg:flex" label="Today's orders" value={stats.todaysOrders} icon={<ShoppingBag className="h-4 w-4" />} />
        <Tile label="Delivered" value={stats.delivered} icon={<Check className="h-4 w-4" />} />
        <Tile label="Total sale" value={taka(stats.totalSales)} icon={<TrendingUp className="h-4 w-4" />} />
        <Tile label="Cash paid" value={taka(stats.cashPaid)} icon={<Banknote className="h-4 w-4" />} />
        <Tile label="Credit balance" value={taka(stats.creditBalance)} icon={<Wallet className="h-4 w-4" />} />
        <Tile label="Active users" value={stats.activeUsers} icon={<Users className="h-4 w-4" />} />
      </div>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Pack by item</h2>
        <p className="mb-3 text-xs text-ink-muted">Grouped by dish · tap a row to see who ordered and where</p>
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

function Tile({ label, value, icon, className }: { label: string; value: string | number; icon: ReactNode; className?: string }) {
  return (
    <div className={cn("surface-card flex min-w-0 flex-col justify-between rounded-2xl px-3 py-3 sm:px-4", className)}>
      <div className="flex items-center justify-between gap-2 text-xs font-medium text-ink-muted">
        {label}
        {icon}
      </div>
      <p className="tnum mt-3 text-xl font-semibold">{value}</p>
    </div>
  );
}

function ProgressRing({ delivered, total }: { delivered: number; total: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const pct = total === 0 ? 0 : delivered / total;
  const dash = c * pct;
  return (
    <div className="relative grid h-24 w-24 shrink-0 place-items-center" aria-hidden>
      <svg viewBox="0 0 84 84" className="h-24 w-24 -rotate-90">
        <circle cx="42" cy="42" r={r} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="8" />
        <circle
          cx="42"
          cy="42"
          r={r}
          fill="none"
          stroke="#D4FF3A"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
        />
      </svg>
      <div className="absolute text-center leading-tight">
        <p className="tnum text-sm font-semibold">
          {delivered}/{total}
        </p>
        <p className="text-[10px] text-white/80">delivered</p>
      </div>
    </div>
  );
}

function PackList({ items }: { items: PackRow[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <ul className="surface-card divide-y divide-line overflow-hidden rounded-3xl">
      {items.map((row) => {
        const isOpen = open === row.key;
        const meal = row.slot === "LUNCH" ? "Lunch" : "Dinner";
        return (
          <li key={row.key}>
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-3 text-left"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : row.key)}
            >
              {row.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={row.imageUrl} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#5B4CF5]/10 text-xs font-semibold text-[#5B4CF5]">
                  {row.title.slice(0, 1)}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{row.title}</span>
                <span className="block truncate text-xs text-ink-muted">
                  {meal} · {row.officeName} · {row.orders} {row.orders === 1 ? "order" : "orders"} · {row.portions} portions · {taka(row.amount)}
                </span>
              </span>
              <span className="tnum rounded-full bg-sand px-3 py-1 text-sm font-semibold">{row.portions}</span>
              <ChevronDown className={cn("h-4 w-4 shrink-0 text-ink-muted transition", isOpen && "rotate-180")} />
            </button>
            {isOpen ? (
              <ul className="space-y-1 border-t border-line bg-sand/60 px-4 py-3 pl-16 text-sm">
                <li className="pb-1 text-xs font-medium text-ink-muted">
                  {row.orders} orders · {row.portions} portions · {taka(row.amount)}
                </li>
                {row.people.map((person) => (
                  <li key={person.orderId} className="flex items-center justify-between gap-3">
                    <span>
                      <b>{person.name}</b>
                      <span className="text-ink-muted">
                        {" "}
                        · {[person.floor ? `Floor ${person.floor}` : null, person.desk ? `Desk ${person.desk}` : null].filter(Boolean).join(" · ") || row.officeName}
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
