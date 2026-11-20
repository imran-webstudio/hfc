"use client";

import { useEffect, useState } from "react";
import type { Slot } from "@prisma/client";
import { Plus, X } from "lucide-react";
import { addWeeklyOptionAction, removeOptionAction, saveCutoffsAction, updateOptionAction } from "@/actions/admin-menu";
import { PhotoField } from "@/components/admin/photo-field";
import { ConfirmDialog } from "@/components/ui/modal";
import { useAct } from "@/components/ui/use-act";
import { cn } from "@/lib/cn";
import { taka } from "@/lib/money";
import { fmtShort, WEEK_ORDER, WEEKDAYS_LONG, WEEKDAYS_SHORT } from "@/lib/time";

export type WeekDish = {
  id: string;
  weekday: number;
  slot: Slot;
  title: string;
  description: string | null;
  price: number;
  maxQuantity: number | null;
  imageUrl: string | null;
  /** Portions already ordered for this weekday's date this week (global pool). */
  ordered: number;
  /** Manually stocked out for this weekday's date this week. */
  stockedOut: boolean;
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
  const [day, setDay] = useState(todayWeekday);
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

      <section className="rounded-3xl border border-line bg-rice p-4 sm:p-5">
        <header className="flex items-center justify-between gap-2">
          <h2 className="text-[22px] font-extrabold tracking-tight">Weekly Menu</h2>
          <span className="rounded-full bg-[#E4F5E4] px-3 py-1.5 text-[13px] font-bold text-[#1E9E4A] dark:bg-[#0E2A1A] dark:text-[#3DD68C]">Recurring</span>
        </header>
        <div className="mt-4 grid grid-cols-4 gap-2.5" role="tablist" aria-label="Weekday">
          {WEEK_ORDER.map((wd) => (
            <button
              key={wd}
              type="button"
              role="tab"
              aria-selected={day === wd}
              onClick={() => setDay(wd)}
              className={cn(
                "relative rounded-2xl py-3.5 text-base font-semibold",
                day === wd ? "bg-[#5B4CF5] text-white" : "bg-ink/5 text-ink hover:bg-ink/10 dark:bg-white/5",
              )}
            >
              {WEEKDAYS_SHORT[wd]}
              {wd === todayWeekday ? (
                <span className={cn("absolute right-2 top-2 h-1.5 w-1.5 rounded-full", day === wd ? "bg-white" : "bg-[#5B4CF5]")} aria-label="Today" />
              ) : null}
            </button>
          ))}
        </div>
        <div className="mt-3.5 flex items-baseline justify-between gap-3">
          <p className="text-[15px] text-ink-muted">নির্বাচিত দিনের Menu নিচে দেখাবে।</p>
          <p className="shrink-0 text-sm text-ink-muted">
            {WEEKDAYS_LONG[day]}
            {weekDates[day] ? ` · ${fmtShort(weekDates[day])}` : ""}
          </p>
        </div>
        <p className="sr-only">Meal day used for highlighting: {today}</p>
      </section>

      {(["LUNCH", "DINNER"] as const).map((slot) => {
        const items = dishes.filter((d) => d.weekday === day && d.slot === slot);
        const name = slot === "LUNCH" ? "Lunch" : "Dinner";
        return (
          <section key={slot} className="rounded-3xl border border-line bg-rice p-4 sm:p-5">
            <header className="flex items-center justify-between gap-2">
              <h2 className="text-[22px] font-extrabold tracking-tight">{name}</h2>
              <span className="rounded-full bg-[#E4F5E4] px-3 py-1.5 text-[13px] font-bold text-[#1E9E4A] dark:bg-[#0E2A1A] dark:text-[#3DD68C]">Every {WEEKDAYS_LONG[day]}</span>
            </header>
            {items.length === 0 ? (
              <p className="mt-3.5 text-[15px] text-ink-muted">No {name.toLowerCase()} menu added yet.</p>
            ) : (
              <ul className="mt-2 divide-y divide-line">
                {items.map((dish) => {
                  const available = dish.stockedOut ? 0 : dish.maxQuantity == null ? null : Math.max(0, dish.maxQuantity - dish.ordered);
                  return (
                    <li key={dish.id} className="flex items-start gap-3.5 py-3.5">
                      {dish.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={dish.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-2xl object-cover sm:h-24 sm:w-24" />
                      ) : (
                        <span className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-[#5B4CF5]/10 text-xl font-bold text-[#5B4CF5] sm:h-24 sm:w-24">{dish.title.slice(0, 1)}</span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[17px] font-bold">{dish.title}</p>
                        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                          {taka(dish.price)} • Maximum Quantity: {dish.maxQuantity ?? "Unlimited"}
                          <br />
                          Available Stock: {dish.stockedOut ? "0 (Stock Out)" : available == null ? "Unlimited" : available}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openEdit(dish)}
                        className="shrink-0 rounded-full border-[1.5px] border-line px-5 py-2 text-[15px] font-semibold hover:bg-ink/5"
                      >
                        Edit
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <button
              type="button"
              onClick={() => openAdd(day, slot)}
              className="mt-3 flex w-full items-center justify-center gap-1 rounded-full border-[1.5px] border-line py-3.5 text-[17px] font-bold hover:bg-ink/5"
            >
              <Plus className="h-5 w-5" /> Add Option
            </button>
          </section>
        );
      })}

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
          onDelete={() => {
            const id = edit.optionId;
            setEdit(null);
            setRemoveId(id);
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
        <label className="block w-full sm:w-56" htmlFor="cutoff-office">
          <span className="field-label">Office</span>
          <select id="cutoff-office" name="office" autoComplete="off" className="input" value={office.id} onChange={(e) => setOfficeId(e.target.value)}>
            {offices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block w-36" htmlFor="cutoff-lunch">
          <span className="field-label">Lunch cutoff</span>
          <input id="cutoff-lunch" name="lunchCutoff" autoComplete="off" className="input tnum" inputMode="numeric" required pattern="([01]\d|2[0-3]):[0-5]\d" placeholder="10:30" value={lunch} onChange={(e) => setLunch(e.target.value)} />
        </label>
        <label className="block w-36" htmlFor="cutoff-dinner">
          <span className="field-label">Dinner cutoff</span>
          <input id="cutoff-dinner" name="dinnerCutoff" autoComplete="off" className="input tnum" inputMode="numeric" required pattern="([01]\d|2[0-3]):[0-5]\d" placeholder="16:00" value={dinner} onChange={(e) => setDinner(e.target.value)} />
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
  onDelete,
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
  /** Edit mode only: delete lives inside Edit, like the old site. */
  onDelete?: () => void;
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
        <label className="mb-3 block" htmlFor={`dish-title-${mode}-${weekday}-${slot}`}>
          <span className="field-label">Title</span>
          <input id={`dish-title-${mode}-${weekday}-${slot}`} name="title" autoComplete="off" className="input" required autoFocus placeholder="e.g. Chicken Curry with rice" value={draft.title} onChange={(e) => onChange({ ...draft, title: e.target.value })} />
        </label>
        <label className="mb-3 block" htmlFor={`dish-description-${mode}-${weekday}-${slot}`}>
          <span className="field-label">Description</span>
          <textarea id={`dish-description-${mode}-${weekday}-${slot}`} name="description" autoComplete="off" className="input min-h-20 resize-y" value={draft.description} onChange={(e) => onChange({ ...draft, description: e.target.value })} />
        </label>
        <div className="mb-3 grid grid-cols-2 gap-3">
          <label className="block" htmlFor={`dish-price-${mode}-${weekday}-${slot}`}>
            <span className="field-label">Price</span>
            <span className="relative block">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">৳</span>
              <input id={`dish-price-${mode}-${weekday}-${slot}`} name="price" autoComplete="off" className="input tnum pl-8" inputMode="numeric" required placeholder="" value={draft.price} onChange={(e) => onChange({ ...draft, price: e.target.value.replace(/[^\d]/g, "") })} />
            </span>
          </label>
          <label className="block" htmlFor={`dish-max-${mode}-${weekday}-${slot}`}>
            <span className="field-label">Maximum quantity</span>
            <input id={`dish-max-${mode}-${weekday}-${slot}`} name="maxQuantity" autoComplete="off" className="input tnum" inputMode="numeric" placeholder="Unlimited" value={draft.maxQuantity} onChange={(e) => onChange({ ...draft, maxQuantity: e.target.value.replace(/[^\d]/g, "") })} />
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
        {onDelete ? (
          <button
            type="button"
            disabled={busy}
            onClick={onDelete}
            className="mt-3 w-full rounded-full bg-[#FDECEC] py-3.5 text-base font-bold text-[#E03131] dark:bg-[#2B1216] dark:text-[#FF7A7A]"
          >
            Delete dish
          </button>
        ) : null}
      </form>
    </div>
  );
}
