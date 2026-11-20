"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import { mealsForDateAction, placeOrderForMemberAction, searchMembersAction } from "@/actions/admin-orders";
import { Modal } from "@/components/ui/modal";
import { useAct } from "@/components/ui/use-act";
import { addDays } from "@/lib/time";
import { taka } from "@/lib/money";

type Member = { id: string; name: string | null; employeeId: string | null; floor: string | null; desk: string | null };
type Meal = { id: string; slot: string; title: string; price: number; available: boolean; label: string };
type Row = { optionId: string; title: string; price: number; quantity: number };

export function PhoneOrderSection({ offices, today, maxDays }: { offices: { id: string; name: string }[]; today: string; maxDays: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn bg-[#5B4CF5] text-white hover:bg-[#4636e0] max-lg:fixed max-lg:bottom-[5.75rem] max-lg:left-1/2 max-lg:z-30 max-lg:-translate-x-1/2 max-lg:rounded-full max-lg:px-5 max-lg:shadow-lg" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Order for member
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Order for member" subtitle="Place a phone order under a member's account. Cutoff is skipped for admins.">
        <PhoneOrderForm offices={offices} today={today} maxDays={maxDays} onClose={() => setOpen(false)} />
      </Modal>
    </>
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
  const [rows, setRows] = useState<Row[]>([]);
  const [addId, setAddId] = useState("");
  const [note, setNote] = useState("Phone Order");
  const [focused, setFocused] = useState(false);
  const reqId = useRef(0);
  const grandTotal = rows.reduce((s, r) => s + r.price * r.quantity, 0);

  useEffect(() => {
    let live = true;
    setMeals(null);
    setRows([]);
    setAddId("");
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

  const addMeal = () => {
    const m = meals?.find((x) => x.id === addId);
    if (!m) return;
    setRows((rs) => {
      const existing = rs.find((r) => r.optionId === m.id);
      if (existing) return rs.map((r) => (r.optionId === m.id ? { ...r, quantity: Math.min(20, r.quantity + 1) } : r));
      return [...rs, { optionId: m.id, title: m.title, price: m.price, quantity: 1 }];
    });
    setAddId("");
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!member || !rows.length) return;
        act(() => placeOrderForMemberAction({ userId: member.id, items: rows.map((r) => ({ optionId: r.optionId, quantity: r.quantity })), date, note }), {
          success: `Order placed for ${member.name}`,
          onOk: onClose,
        });
      }}
    >
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
          <label className="field-label" htmlFor="po-date">Select meal date</label>
          <input id="po-date" type="date" className="input" required min={today} max={addDays(today, maxDays)} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          <p className="mt-1 text-[10px] text-ink-muted">Today through ~{Math.round(maxDays / 7)} weeks ahead</p>
        </div>

        <div className="relative sm:col-span-2">
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
      </div>

      {/* Multi-item meals (spec §6.2–6.3): add as many meals as needed under one order. */}
      <div className="mt-4">
        <p className="field-label">Meals</p>
        {rows.length ? (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.optionId} className="flex items-center gap-2 rounded-xl bg-ink/[0.04] px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{r.title}</span>
                <div className="flex items-center rounded-full bg-rice ring-1 ring-line">
                  <button type="button" aria-label="Decrease" className="grid h-8 w-8 place-items-center" onClick={() => setRows((rs) => rs.map((x) => (x.optionId === r.optionId ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x)))}>
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-5 text-center text-sm font-bold">{r.quantity}</span>
                  <button type="button" aria-label="Increase" className="grid h-8 w-8 place-items-center" onClick={() => setRows((rs) => rs.map((x) => (x.optionId === r.optionId ? { ...x, quantity: Math.min(20, x.quantity + 1) } : x)))}>
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <span className="tnum w-16 text-right text-sm">{taka(r.price * r.quantity)}</span>
                <button type="button" aria-label={`Remove ${r.title}`} onClick={() => setRows((rs) => rs.filter((x) => x.optionId !== r.optionId))}>
                  <X className="h-4 w-4 text-ink-muted" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-ink-muted">No meals added yet.</p>
        )}
        <div className="mt-2 flex gap-2">
          <select id="po-meal" className="input flex-1" value={addId} onChange={(e) => setAddId(e.target.value)} disabled={meals === null}>
            <option value="">{meals === null ? "Loading meals…" : meals.length === 0 ? "No meals published for this day" : "Select meal…"}</option>
            {meals?.map((m) => (
              <option key={m.id} value={m.id} disabled={!m.available}>
                {m.label}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-ghost" disabled={!addId} onClick={addMeal}>
            Add another meal
          </button>
        </div>
      </div>

      <div className="mt-4">
        <label className="field-label" htmlFor="po-note">Note</label>
        <input id="po-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <p className="mt-4 flex justify-between text-sm font-semibold">
        <span>Grand total</span>
        <span className="tnum">{taka(grandTotal)}</span>
      </p>
      <div className="mt-5 flex items-center gap-2">
        <button type="submit" className="btn btn-spice" disabled={pending || !member || !rows.length}>
          Place order for member
        </button>
        <button type="button" className="btn btn-text" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  );
}
