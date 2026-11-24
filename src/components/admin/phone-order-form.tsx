"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import { mealsForDateAction, placeOrderForMemberAction, searchMembersAction } from "@/actions/admin-orders";
import { Modal } from "@/components/ui/modal";
import { useAct } from "@/components/ui/use-act";
import { addDays } from "@/lib/time";
import { taka } from "@/lib/money";

type Member = { id: string; name: string | null; employeeId: string | null; floor: string | null; desk: string | null; zoneId: string | null };
type Meal = { id: string; slot: string; title: string; price: number; available: boolean; label: string };
type Row = { optionId: string; quantity: number };

export function PhoneOrderSection({ today, maxDays }: { today: string; maxDays: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn bg-[#5B4CF5] text-white hover:bg-[#4636e0] max-lg:fixed max-lg:bottom-[5.75rem] max-lg:left-1/2 max-lg:z-30 max-lg:-translate-x-1/2 max-lg:rounded-full max-lg:px-5 max-lg:shadow-lg" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Order for member
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Order for member" subtitle="Place a phone order under a member's account. Cutoff is skipped for admins.">
        <PhoneOrderForm today={today} maxDays={maxDays} onClose={() => setOpen(false)} />
      </Modal>
    </>
  );
}

/**
 * Phone-order form (owner's reference design): no office filter — the meals
 * come from the selected member's own office. Every meal is a card with its
 * own meal picker, a labelled Quantity stepper and a Subtotal line.
 */
function PhoneOrderForm({ today, maxDays, onClose }: { today: string; maxDays: number; onClose: () => void }) {
  const { act, pending } = useAct();
  const [date, setDate] = useState(today);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Member[]>([]);
  const [member, setMember] = useState<Member | null>(null);
  const [meals, setMeals] = useState<Meal[] | null>(null);
  const [rows, setRows] = useState<Row[]>([{ optionId: "", quantity: 1 }]);
  const [focused, setFocused] = useState(false);
  const reqId = useRef(0);

  const mealOf = (optionId: string) => meals?.find((m) => m.id === optionId) ?? null;
  const chosen = rows.filter((r) => r.optionId);
  const grandTotal = chosen.reduce((s, r) => s + (mealOf(r.optionId)?.price ?? 0) * r.quantity, 0);

  // Meals follow the member's own office + the picked date.
  useEffect(() => {
    let live = true;
    setMeals(null);
    setRows([{ optionId: "", quantity: 1 }]);
    if (!member?.zoneId || !date) return;
    mealsForDateAction(member.zoneId, date).then((r) => {
      if (live) setMeals(r.ok ? r.data : []);
    });
    return () => {
      live = false;
    };
  }, [member, date]);

  // Member search spans every office (staff scope still applies server-side).
  useEffect(() => {
    if (member) return;
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      const r = await searchMembersAction(q);
      if (r.ok && id === reqId.current) setResults(r.data);
    }, 200);
    return () => clearTimeout(t);
  }, [q, member]);

  const setRow = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, x) => (x === i ? { ...r, ...patch } : r)));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!member || !chosen.length) return;
        act(
          () =>
            placeOrderForMemberAction({
              userId: member.id,
              items: chosen.map((r) => ({ optionId: r.optionId, quantity: r.quantity })),
              date,
            }),
          { success: `Order placed for ${member.name}`, onOk: onClose },
        );
      }}
    >
      <div>
        <label className="field-label" htmlFor="po-date">Select meal date</label>
        <input id="po-date" type="date" className="input" required min={today} max={addDays(today, maxDays)} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        <p className="mt-1 text-[10px] text-ink-muted">Today through ~{Math.round(maxDays / 7)} weeks ahead</p>
      </div>

      <div className="relative mt-4">
        <label className="field-label" htmlFor="po-member">Search member by name or employee ID</label>
        {member ? (
          <div className="input flex items-center justify-between">
            <span className="truncate">
              {member.name} <span className="text-ink-muted">· {member.employeeId ?? "no ID"}</span>
            </span>
            <button type="button" aria-label="Clear member" onClick={() => setMember(null)}>
              <X className="h-3.5 w-3.5 text-ink-muted" />
            </button>
          </div>
        ) : (
          <>
            <input id="po-member" className="input" placeholder="Search name, email, ID, desk…" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 150)} />
            {focused && results.length > 0 ? (
              <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-line bg-rice p-1 shadow-2xl">
                {results.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs hover:bg-ink/5"
                      onClick={() => {
                        setMember(m);
                        setQ("");
                      }}
                    >
                      <span className="font-semibold">{m.name}</span>
                      <span className="text-ink-muted">{m.employeeId ?? "—"}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </div>

      <div className="mt-5">
        <p className="field-label">Meals</p>
        {!member ? (
          <p className="text-xs text-ink-muted">Select a member first — meals load from their office.</p>
        ) : !member.zoneId ? (
          <p className="text-xs text-[#E03131]">This member has no office set yet — they need to complete their profile before orders can be placed.</p>
        ) : meals === null ? (
          <p className="text-xs text-ink-muted">Loading meals…</p>
        ) : meals.length === 0 ? (
          <p className="text-xs text-ink-muted">No meals published for this day.</p>
        ) : (
          <>
            <ul className="space-y-3">
              {rows.map((r, i) => {
                const meal = mealOf(r.optionId);
                return (
                  <li key={i} className="rounded-2xl bg-ink/[0.04] px-4 py-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-semibold text-ink-muted">Meal {i + 1}</span>
                      <span className="flex items-center gap-2">
                        {meal ? <span className="tnum text-[15px] font-extrabold">{taka(meal.price)}</span> : null}
                        {rows.length > 1 ? (
                          <button type="button" aria-label={`Remove meal ${i + 1}`} onClick={() => setRows((rs) => rs.filter((_, x) => x !== i))}>
                            <X className="h-4 w-4 text-ink-muted" />
                          </button>
                        ) : null}
                      </span>
                    </div>
                    {meal ? (
                      <p className="mt-1 text-[15px] font-bold">
                        {meal.slot === "LUNCH" ? "Lunch" : "Dinner"} · {meal.title}
                      </p>
                    ) : (
                      <select
                        aria-label={`Meal ${i + 1}`}
                        className="input mt-1.5"
                        value={r.optionId}
                        onChange={(e) => setRow(i, { optionId: e.target.value })}
                      >
                        <option value="">Select meal…</option>
                        {meals.map((m) => (
                          <option key={m.id} value={m.id} disabled={!m.available || (m.id !== r.optionId && rows.some((x) => x.optionId === m.id))}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    )}
                    <div className="mt-2.5 flex items-center justify-between gap-3">
                      <span className="text-sm text-ink-muted">Quantity</span>
                      <span className="flex items-center gap-3">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          className="grid h-9 w-9 place-items-center rounded-full bg-ink/[0.07] transition hover:bg-ink/[0.12] disabled:opacity-40"
                          disabled={r.quantity <= 1}
                          onClick={() => setRow(i, { quantity: Math.max(1, r.quantity - 1) })}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="tnum w-5 text-center text-[17px] font-extrabold">{r.quantity}</span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          className="grid h-9 w-9 place-items-center rounded-full bg-[#5B4CF5] text-white transition hover:bg-[#4636e0] disabled:opacity-40"
                          disabled={r.quantity >= 20}
                          onClick={() => setRow(i, { quantity: Math.min(20, r.quantity + 1) })}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </span>
                    </div>
                    {meal ? (
                      <p className="tnum mt-2.5 border-t border-line pt-2.5 text-right text-sm text-ink-muted">
                        Subtotal: <span className="font-extrabold text-ink">{taka(meal.price * r.quantity)}</span>
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full border-[1.5px] border-[#5B4CF5]/60 py-3 text-[15px] font-bold text-[#5B4CF5] transition hover:bg-[#5B4CF5]/5 disabled:opacity-40"
              disabled={rows.length >= meals.length}
              onClick={() => setRows((rs) => [...rs, { optionId: "", quantity: 1 }])}
            >
              <Plus className="h-4.5 w-4.5" /> Add another meal
            </button>
          </>
        )}
      </div>

      <p className="mt-5 flex items-baseline justify-between">
        <span className="text-[15px] font-bold">Grand total</span>
        <span className="tnum text-[22px] font-extrabold">{taka(grandTotal)}</span>
      </p>
      <div className="mt-4 flex items-center gap-2">
        <button type="submit" className="btn btn-spice flex-1 py-3" disabled={pending || !member || !chosen.length}>
          Place order for member
        </button>
        <button type="button" className="rounded-full bg-ink/[0.06] px-6 py-3 text-[15px] font-semibold transition hover:bg-ink/[0.1]" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  );
}
