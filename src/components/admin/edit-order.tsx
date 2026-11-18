"use client";

import { useEffect, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import { editOrderAction, mealsForDateAction } from "@/actions/admin-orders";
import { Modal } from "@/components/ui/modal";
import { useAct } from "@/components/ui/use-act";
import { taka } from "@/lib/money";

type Meal = { id: string; slot: string; title: string; price: number; available: boolean; label: string };
export type EditLine = { optionId: string | null; title: string; quantity: number; subtotal: number };

/**
 * Edit Order (spec §6.7): change quantities, remove meals, add meals for the same
 * meal date/office. Server re-validates global stock and rewrites the bill delta.
 * Only offered for UNPAID orders (the server refuses paid ones).
 */
export function EditOrderModal({
  orderId,
  officeId,
  mealDate,
  initial,
  onClose,
}: {
  orderId: string;
  officeId: string;
  mealDate: string;
  initial: EditLine[];
  onClose: () => void;
}) {
  const { act, pending } = useAct();
  const [meals, setMeals] = useState<Meal[] | null>(null);
  const [rows, setRows] = useState<{ optionId: string; title: string; price: number; quantity: number }[]>(
    initial
      .filter((l): l is EditLine & { optionId: string } => !!l.optionId)
      .map((l) => ({ optionId: l.optionId, title: l.title, price: l.quantity ? l.subtotal / l.quantity : 0, quantity: l.quantity })),
  );
  const [addId, setAddId] = useState("");
  const total = rows.reduce((s, r) => s + r.price * r.quantity, 0);

  useEffect(() => {
    let live = true;
    mealsForDateAction(officeId, mealDate).then((r) => {
      if (live && r.ok) setMeals(r.data);
    });
    return () => {
      live = false;
    };
  }, [officeId, mealDate]);

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
    <Modal open onClose={onClose} title="Edit order" subtitle="Quantities and meals — stock and the bill are recalculated on save.">
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
            <span className="tnum w-16 text-right text-sm font-semibold">{taka(r.price * r.quantity)}</span>
            <button type="button" aria-label={`Remove ${r.title}`} onClick={() => setRows((rs) => rs.filter((x) => x.optionId !== r.optionId))}>
              <X className="h-4 w-4 text-ink-muted" />
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex gap-2">
        <select className="input flex-1" value={addId} onChange={(e) => setAddId(e.target.value)} disabled={meals === null}>
          <option value="">{meals === null ? "Loading meals…" : "Add another meal…"}</option>
          {meals?.map((m) => (
            <option key={m.id} value={m.id} disabled={!m.available}>
              {m.label}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-ghost" disabled={!addId} onClick={addMeal}>
          Add
        </button>
      </div>

      <p className="mt-4 flex justify-between text-sm font-semibold">
        <span>Grand total</span>
        <span className="tnum">{taka(total)}</span>
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-spice"
          disabled={pending || rows.length === 0}
          onClick={() =>
            act(() => editOrderAction(orderId, rows.map((r) => ({ optionId: r.optionId, quantity: r.quantity }))), { success: "Order updated", onOk: onClose })
          }
        >
          Update order
        </button>
      </div>
    </Modal>
  );
}
