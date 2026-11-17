"use client";

import { useEffect, useState } from "react";
import type { Slot } from "@prisma/client";
import { Plus, Trash2, X } from "lucide-react";
import { addWeeklyOptionAction, removeOptionAction, saveCutoffsAction, updateOptionAction } from "@/actions/admin-menu";
import { PhotoField } from "@/components/admin/photo-field";
import { ConfirmDialog } from "@/components/ui/modal";
import { useAct } from "@/components/ui/use-act";
import { cn } from "@/lib/cn";
import { taka } from "@/lib/money";
import { fmtShort, WEEK_ORDER, WEEKDAYS_LONG } from "@/lib/time";

export type WeekDish = {
  id: string;
  weekday: number;
  slot: Slot;
  title: string;
  description: string | null;
  price: number;
  maxQuantity: number | null;
  imageUrl: string | null;
};

type Office = { id: string; name: string; lunchCutoff: string; dinnerCutoff: string };

type Draft = { title: string; description: string; price: string; maxQuantity: string; imageUrl: string | null };
const emptyDraft = (): Draft => ({ title: "", description: "", price: "", maxQuantity: "", imageUrl: null });

type AddState = { weekday: number; slot: Slot; draft: Draft };
type EditState = { optionId: string; weekday: number; slot: Slot; draft: Draft };

export function MenuStudio({
  offices,
  initialOfficeId,
  dishes,
  today,
  todayWeekday,
  weekDates,
}: {
  offices: Office[];
  initialOfficeId: string;
  dishes: WeekDish[];
  today: string;
  todayWeekday: number;
  weekDates: Record<number, string>;
}) {
  const { act, pending } = useAct();
  const [add, setAdd] = useState<AddState | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [front, setFront] = useState<"add" | "edit">("add");
  const [removeId, setRemoveId] = useState<string | null>(null);

  function openAdd(weekday: number, slot: Slot) {
    setAdd({ weekday, slot, draft: emptyDraft() });
    setFront("add");
  }
  function openEdit(dish: WeekDish) {
    setEdit({
      optionId: dish.id,
      weekday: dish.weekday,
      slot: dish.slot,
      draft: {
        title: dish.title,
        description: dish.description ?? "",
        price: String(dish.price),
        maxQuantity: dish.maxQuantity == null ? "" : String(dish.maxQuantity),
        imageUrl: dish.imageUrl,
      },
    });
    setFront("edit");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="hidden text-3xl font-semibold tracking-tight lg:block">Menu</h1>
      <CutoffCard offices={offices} initialId={initialOfficeId} />

      <section>
        <h2 className="text-lg font-semibold">Weekly schedule</h2>
        <p className="mb-3 text-xs text-ink-muted">Same menu at every location · repeats every week · today is highlighted</p>
        <div className="grid gap-3 lg:grid-cols-2">
          {WEEK_ORDER.map((wd) => {
            const isToday = wd === todayWeekday;
            const date = weekDates[wd];
            return (
              <article
                key={wd}
                className={cn(
                  "rounded-3xl border bg-rice p-4",
                  isToday ? "border-[#5B4CF5] bg-[var(--hfc-today)] ring-2 ring-[#5B4CF5]/20" : "border-line",
                )}
              >
                <header className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{WEEKDAYS_LONG[wd]}</p>
                    <p className="text-xs text-ink-muted">{date ? fmtShort(date) : ""}</p>
                  </div>
                  {isToday ? <span className="rounded-full bg-[#5B4CF5] px-2.5 py-1 text-[11px] font-semibold text-white">Today</span> : null}
                </header>
                {(["LUNCH", "DINNER"] as const).map((slot) => {
                  const items = dishes.filter((d) => d.weekday === wd && d.slot === slot);
                  return (
                    <div key={slot} className="mb-3 last:mb-0">
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{slot === "LUNCH" ? "Lunch" : "Dinner"}</p>
                      <ul>
                        {items.map((dish) => (
                          <li key={dish.id} className="flex items-center gap-1 border-b border-line last:border-0">
                            <button type="button" className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-3 py-2 text-left" onClick={() => openEdit(dish)}>
                              <span className="truncate font-medium">{dish.title}</span>
                              <span className="tnum shrink-0 text-sm text-ink-muted">{taka(dish.price)}</span>
                            </button>
                            <button type="button" className="icon-btn danger" aria-label={`Delete ${dish.title}`} onClick={() => setRemoveId(dish.id)}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                      <button type="button" className="mt-1 flex h-11 w-full items-center justify-center gap-1 text-sm font-semibold text-primary" onClick={() => openAdd(wd, slot)}>
                        <Plus className="h-4 w-4" /> Add option
                      </button>
                    </div>
                  );
                })}
              </article>
            );
          })}
        </div>
        <p className="sr-only">Meal day used for highlighting: {today}</p>
      </section>

      {add ? (
        <DishModal
          mode="add"
          weekday={add.weekday}
          slot={add.slot}
          draft={add.draft}
          busy={pending}
          z={front === "add" ? 60 : 50}
          onChange={(draft) => setAdd({ ...add, draft })}
          onClose={() => setAdd(null)}
          onFocus={() => setFront("add")}
          onSubmit={() => {
            const payload = toPayload(add.slot, add.draft);
            if (!payload) return;
            act(() => addWeeklyOptionAction("all", add.weekday, payload), { success: "Dish added", onOk: () => setAdd(null) });
          }}
        />
      ) : null}

      {edit ? (
        <DishModal
          mode="edit"
          weekday={edit.weekday}
          slot={edit.slot}
          draft={edit.draft}
          busy={pending}
          z={front === "edit" ? 60 : 50}
          onChange={(draft) => setEdit({ ...edit, draft })}
          onClose={() => setEdit(null)}
          onFocus={() => setFront("edit")}
          onSubmit={() => {
            const payload = toPayload(edit.slot, edit.draft);
            if (!payload) return;
            act(() => updateOptionAction(edit.optionId, payload), { success: "Dish updated", onOk: () => setEdit(null) });
          }}
        />
      ) : null}

      <ConfirmDialog
        open={removeId != null}
        title="Remove this dish?"
        text="It will disappear from the menu at every location you manage. Past orders keep the dish."
        confirmLabel="Delete dish"
        danger
        busy={pending}
        onClose={() => setRemoveId(null)}
        onConfirm={() => {
          if (!removeId) return;
          act(() => removeOptionAction(removeId), { success: "Dish removed", onOk: () => setRemoveId(null) });
        }}
      />
    </div>
  );
}

function toPayload(slot: Slot, draft: Draft) {
  const price = Number(draft.price);
  if (!draft.title.trim()) return null;
  if (!Number.isInteger(price) || price < 0) return null;
  const maxRaw = draft.maxQuantity.trim();
  const maxQuantity = maxRaw === "" ? null : Number(maxRaw);
  if (maxQuantity != null && (!Number.isInteger(maxQuantity) || maxQuantity < 1)) return null;
  return {
    slot,
    title: draft.title,
    description: draft.description,
    price,
    imageUrl: draft.imageUrl,
    maxQuantity,
  };
}

function CutoffCard({ offices, initialId }: { offices: Office[]; initialId: string }) {
  const { act, pending } = useAct();
  const [officeId, setOfficeId] = useState(initialId);
  const office = offices.find((o) => o.id === officeId) ?? offices[0];
  const [lunch, setLunch] = useState(office?.lunchCutoff ?? "13:00");
  const [dinner, setDinner] = useState(office?.dinnerCutoff ?? "20:00");
  useEffect(() => {
    if (!office) return;
    setLunch(office.lunchCutoff);
    setDinner(office.dinnerCutoff);
  }, [office]);
  if (!office) return null;
  const dirty = lunch !== office.lunchCutoff || dinner !== office.dinnerCutoff;
  return (
    <form
      className="surface-card rounded-3xl p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!dirty) return;
        act(() => saveCutoffsAction(office.id, lunch, dinner), { success: "Cutoffs saved" });
      }}
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Order cutoffs</h2>
          <p className="text-xs text-ink-muted">Members cannot place that meal after this time, in Asia/Dhaka. Cutoffs stay per office.</p>
        </div>
        <label className="block w-full sm:w-56">
          <span className="field-label">Office</span>
          <select className="input" value={office.id} onChange={(e) => setOfficeId(e.target.value)}>
            {offices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block w-36">
          <span className="field-label">Lunch cutoff</span>
          <input className="input tnum" inputMode="numeric" required pattern="([01]\d|2[0-3]):[0-5]\d" placeholder="10:30" value={lunch} onChange={(e) => setLunch(e.target.value)} />
        </label>
        <label className="block w-36">
          <span className="field-label">Dinner cutoff</span>
          <input className="input tnum" inputMode="numeric" required pattern="([01]\d|2[0-3]):[0-5]\d" placeholder="16:00" value={dinner} onChange={(e) => setDinner(e.target.value)} />
        </label>
        <button type="submit" className="btn btn-primary" disabled={!dirty || pending}>
          Save
        </button>
      </div>
    </form>
  );
}

function DishModal({
  mode,
  weekday,
  slot,
  draft,
  busy,
  z,
  onChange,
  onClose,
  onFocus,
  onSubmit,
}: {
  mode: "add" | "edit";
  weekday: number;
  slot: Slot;
  draft: Draft;
  busy: boolean;
  z: number;
  onChange: (d: Draft) => void;
  onClose: () => void;
  onFocus: () => void;
  onSubmit: () => void;
}) {
  const [error, setError] = useState("");
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const meal = slot === "LUNCH" ? "Lunch" : "Dinner";
  const heading = `${mode === "add" ? "Add" : "Edit"} · ${WEEKDAYS_LONG[weekday]}, ${meal}`;
  const priceOk = draft.price.trim() !== "" && Number.isInteger(Number(draft.price)) && Number(draft.price) >= 0;
  const maxOk = draft.maxQuantity.trim() === "" || (Number.isInteger(Number(draft.maxQuantity)) && Number(draft.maxQuantity) >= 1);
  const canSave = draft.title.trim().length > 0 && priceOk && maxOk && !busy;
  return (
    <div className="fixed inset-0 grid place-items-center p-4" style={{ zIndex: z }} role="dialog" aria-modal="true" aria-labelledby={`dish-${mode}-${weekday}-${slot}`} onMouseDown={onFocus}>
      <button aria-label="Close dialog" className="absolute inset-0 bg-[#0B0B0F]/45" onClick={onClose} />
      <form
        className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-rice p-5 shadow-[0_16px_40px_rgba(11,11,15,0.18)]"
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSave) {
            setError(maxOk ? "Enter a title and a whole taka price." : "Maximum quantity must be a whole number, or empty for unlimited.");
            return;
          }
          setError("");
          onSubmit();
        }}
      >
        <div className="relative mb-4">
          <h2 id={`dish-${mode}-${weekday}-${slot}`} className="text-center text-lg font-semibold text-[#5B4CF5] dark:text-[#D4FF3A]">
            {heading}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="icon-btn absolute -right-2 -top-2">
            <X className="h-4 w-4" />
          </button>
        </div>
        <label className="mb-3 block">
          <span className="field-label">Title</span>
          <input className="input" required autoFocus placeholder="e.g. Chicken Curry with rice" value={draft.title} onChange={(e) => onChange({ ...draft, title: e.target.value })} />
        </label>
        <label className="mb-3 block">
          <span className="field-label">Description</span>
          <textarea className="input min-h-20 resize-y" value={draft.description} onChange={(e) => onChange({ ...draft, description: e.target.value })} />
        </label>
        <div className="mb-3 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="field-label">Price</span>
            <span className="relative block">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">৳</span>
              <input className="input tnum pl-8" inputMode="numeric" required placeholder="" value={draft.price} onChange={(e) => onChange({ ...draft, price: e.target.value.replace(/[^\d]/g, "") })} />
            </span>
          </label>
          <label className="block">
            <span className="field-label">Maximum quantity</span>
            <input className="input tnum" inputMode="numeric" placeholder="Unlimited" value={draft.maxQuantity} onChange={(e) => onChange({ ...draft, maxQuantity: e.target.value.replace(/[^\d]/g, "") })} />
          </label>
        </div>
        {error ? <p className="mb-2 text-xs text-[#E03131]">{error}</p> : null}
        <PhotoField value={draft.imageUrl} onChange={(imageUrl) => onChange({ ...draft, imageUrl })} />
        <div className="mt-5 flex gap-2 sm:justify-end">
          <button type="button" className="btn btn-ghost flex-1 sm:flex-none" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary flex-1 sm:flex-none" disabled={busy}>
            {mode === "add" ? "Add dish" : "Update"}
          </button>
        </div>
      </form>
    </div>
  );
}
