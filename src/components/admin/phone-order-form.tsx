"use client";

import { useEffect, useRef, useState } from "react";
import { Phone, Plus, X } from "lucide-react";
import { mealsForDateAction, placeOrderForMemberAction, searchMembersAction } from "@/actions/admin-orders";
import { useAct } from "@/components/ui/use-act";
import { addDays } from "@/lib/time";

type Member = { id: string; name: string | null; employeeId: string | null; floor: string | null; desk: string | null; accountType: string };
type Meal = { id: string; label: string };

export function PhoneOrderSection({ offices, today, maxDays }: { offices: { id: string; name: string }[]; today: string; maxDays: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-2">
          <Phone className="mt-0.5 h-3.5 w-3.5 text-leaf" />
          <div>
            <p className="text-sm font-bold">Order for member</p>
            <p className="text-[10px] text-ink-muted">Place a phone order under a member&apos;s account.</p>
          </div>
        </div>
        <button className="btn btn-leaf gap-1.5" onClick={() => setOpen((o) => !o)}>
          <Plus className="h-3.5 w-3.5" /> Order for member
        </button>
      </div>
      {open ? <PhoneOrderForm offices={offices} today={today} maxDays={maxDays} onClose={() => setOpen(false)} /> : null}
    </div>
  );
}

function PhoneOrderForm({ offices, today, maxDays, onClose }: { offices: { id: string; name: string }[]; today: string; maxDays: number; onClose: () => void }) {
  const { act, pending } = useAct();
  const [officeId, setOfficeId] = useState(offices[0]?.id ?? "");
  const [date, setDate] = useState(today);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Member[]>([]);
  const [member, setMember] = useState<Member | null>(null);
  const [meals, setMeals] = useState<Meal[] | null>(null);
  const [mealId, setMealId] = useState("");
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("Phone order");
  const [focused, setFocused] = useState(false);
  const reqId = useRef(0);

  useEffect(() => {
    let live = true;
    setMeals(null);
    setMealId("");
    if (!officeId || !date) return;
    mealsForDateAction(officeId, date).then((r) => {
      if (live) setMeals(r.ok ? r.data : []);
    });
    return () => {
      live = false;
    };
  }, [officeId, date]);

  useEffect(() => {
    if (member) return;
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      const r = await searchMembersAction(q, officeId);
      if (r.ok && id === reqId.current) setResults(r.data);
    }, 200);
    return () => clearTimeout(t);
  }, [q, officeId, member]);

  return (
    <form
      className="surface-card mt-4 rounded-2xl p-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!member) return;
        act(() => placeOrderForMemberAction({ userId: member.id, optionId: mealId, date, quantity: qty, note }), {
          success: `Order placed for ${member.name}`,
          onOk: onClose,
        });
      }}
    >
      <p className="flex items-center gap-2 text-sm font-bold">
        <Phone className="h-3.5 w-3.5 text-leaf" /> Order for member
      </p>
      <p className="mb-4 mt-1 text-[11px] text-ink-muted">
        Record a meal under a member&apos;s account (e.g. after a phone call). Pick any upcoming day — weekday templates load automatically. Orders stay unpaid
        until settled after delivery. Cutoff is skipped for admins.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="po-office">Office</label>
          <select id="po-office" className="input" value={officeId} onChange={(e) => setOfficeId(e.target.value)}>
            {offices.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="po-date">Meal day</label>
          <input id="po-date" type="date" className="input" required min={today} max={addDays(today, maxDays)} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          <p className="mt-1 text-[10px] text-ink-muted">Today through ~{Math.round(maxDays / 7)} weeks ahead</p>
        </div>

        <div className="relative">
          <label className="field-label" htmlFor="po-member">Member</label>
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
                        <span className="text-ink-muted">
                          {m.employeeId ?? "—"} · {m.accountType === "REGULAR" ? "Regular" : "One-time"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </div>
        <div>
          <label className="field-label" htmlFor="po-meal">Meal</label>
          <select id="po-meal" className="input" required value={mealId} onChange={(e) => setMealId(e.target.value)} disabled={meals === null}>
            <option value="">{meals === null ? "Loading meals…" : meals.length === 0 ? "No meals published for this day" : "Select meal…"}</option>
            {meals?.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="po-qty">Quantity</label>
          <input id="po-qty" type="number" min={1} max={20} required className="input" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
        </div>
        <div>
          <label className="field-label" htmlFor="po-note">Note</label>
          <input id="po-note" className="input" placeholder="Phone order" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>
      <div className="mt-5 flex items-center gap-2">
        <button type="submit" className="btn btn-spice" disabled={pending || !member || !mealId}>
          Place order for member
        </button>
        <button type="button" className="btn btn-text" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  );
}
