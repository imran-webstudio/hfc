"use client";

import { useState } from "react";
import type { Slot } from "@prisma/client";
import { PhotoField } from "@/components/admin/photo-field";
import { config } from "@/lib/config";

export type OptionDraft = { title: string; description: string; price: number | ""; imageUrl: string | null };
export type FormMode =
  | { kind: "add"; weekday: number; slot: Slot }
  | { kind: "edit"; optionId: string; weekday: number; slot: Slot }
  | { kind: "dated" };

export const emptyDraft = (): OptionDraft => ({ title: "", description: "", price: config.defaultMealPrice, imageUrl: null });

type Props = {
  mode: FormMode;
  heading: string;
  badge?: string;
  draft: OptionDraft;
  onDraft: (d: OptionDraft) => void;
  busy: boolean;
  scopeLabel: string; // "all locations" | office name
  onSubmit: (extra: { keep: boolean; date: string; slot: Slot }) => void;
  onRemove?: () => void;
  onCancel: () => void;
  offerDinner: boolean;
  minDate: string;
};

/** Add / edit form for weekly options, plus the dated-meal publish form. */
export function OptionForm({ mode, heading, badge, draft, onDraft, busy, scopeLabel, onSubmit, onRemove, onCancel, offerDinner, minDate }: Props) {
  const [keep, setKeep] = useState(mode.kind !== "edit");
  const [date, setDate] = useState(minDate);
  const [slot, setSlot] = useState<Slot>("LUNCH");
  const set = <K extends keyof OptionDraft>(k: K, v: OptionDraft[K]) => onDraft({ ...draft, [k]: v });

  return (
    <form
      className="surface-card space-y-4 rounded-2xl p-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ keep, date, slot });
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-sm font-bold">{heading}</h3>
        {badge ? <span className="chip chip-leaf">{badge}</span> : null}
      </div>

      {mode.kind === "dated" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="of-date">Date</label>
            <input id="of-date" type="date" required className="input" min={minDate} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="field-label" htmlFor="of-slot">Slot</label>
            <select id="of-slot" className="input" value={slot} onChange={(e) => setSlot(e.target.value as Slot)}>
              <option value="LUNCH">Lunch</option>
              {offerDinner ? <option value="DINNER">Dinner</option> : null}
            </select>
          </div>
        </div>
      ) : null}

      <div>
        <label className="field-label" htmlFor="of-title">Title</label>
        <input id="of-title" required className="input" value={draft.title} onChange={(e) => set("title", e.target.value)} />
      </div>
      <div>
        <label className="field-label" htmlFor="of-desc">Description</label>
        <textarea id="of-desc" rows={2} className="input resize-y" value={draft.description} onChange={(e) => set("description", e.target.value)} />
      </div>
      <div className="max-w-44">
        <label className="field-label" htmlFor="of-price">Price (৳)</label>
        <input
          id="of-price"
          type="number"
          required
          min={0}
          className="input"
          value={draft.price}
          onChange={(e) => set("price", e.target.value === "" ? "" : Number(e.target.value))}
        />
      </div>
      <PhotoField value={draft.imageUrl} onChange={(u) => set("imageUrl", u)} />

      {mode.kind !== "edit" ? (
        <>
          <label className="flex items-center gap-2 text-xs text-ink-muted">
            <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} className="h-4 w-4 accent-[#2dd4bf]" />
            Also keep in saved meals
          </label>
          <p className="text-[11px] text-ink-muted">
            {mode.kind === "dated" ? "This meal will be published for the chosen date at " : "This option will be added at "}
            {scopeLabel === "all locations" ? "every active office." : scopeLabel + "."}
          </p>
        </>
      ) : null}

      <div className="flex items-center gap-2">
        <button type="submit" className="btn btn-spice" disabled={busy}>
          {mode.kind === "edit" ? "Update option" : mode.kind === "dated" ? "Publish meal" : scopeLabel === "all locations" ? "Add to all locations" : "Add option"}
        </button>
        {mode.kind === "edit" && onRemove ? (
          <button type="button" className="btn btn-danger" onClick={onRemove} disabled={busy}>
            Remove
          </button>
        ) : null}
        <button type="button" className="btn btn-text" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
