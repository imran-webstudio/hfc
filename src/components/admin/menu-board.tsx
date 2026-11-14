"use client";

import Image from "next/image";
import { useState } from "react";
import type { Slot } from "@prisma/client";
import { Plus } from "lucide-react";
import {
  addDatedOptionAction,
  addWeeklyOptionAction,
  archiveSavedMealAction,
  removeOptionAction,
  stockOutAction,
  updateOptionAction,
} from "@/actions/admin-menu";
import { emptyDraft, OptionForm, type FormMode, type OptionDraft } from "@/components/admin/option-form";
import { ConfirmDialog } from "@/components/ui/modal";
import { useAct } from "@/components/ui/use-act";
import { Chip, EmptyNote } from "@/components/ui/ui";
import { cn } from "@/lib/cn";
import { taka } from "@/lib/money";
import { fmtDay, WEEK_ORDER, WEEKDAYS_LONG, WEEKDAYS_SHORT } from "@/lib/time";

export type WeeklyOpt = { id: string; weekday: number; slot: Slot; title: string; description: string | null; price: number; imageUrl: string | null };
export type LiveOpt = { id: string; slot: Slot; title: string; price: number; imageUrl: string | null; stockedOut: boolean; office: string };
export type SavedOpt = { id: string; title: string; description: string | null; price: number; imageUrl: string | null };

type Props = {
  office: string; // "all" | officeId
  scopeLabel: string; // "all locations" | office name
  previewName: string;
  offerDinner: boolean;
  today: string;
  todayWeekday: number;
  weekly: WeeklyOpt[];
  live: LiveOpt[];
  saved: SavedOpt[];
  archived: SavedOpt[];
};

export function MenuBoard({ office, scopeLabel, previewName, offerDinner, today, todayWeekday, weekly, live, saved, archived }: Props) {
  const { act, pending } = useAct();
  const [mode, setMode] = useState<FormMode | null>(null);
  const [draft, setDraft] = useState<OptionDraft>(emptyDraft());
  const [formKey, setFormKey] = useState(0);
  const [showArchived, setShowArchived] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const slots: Slot[] = offerDinner ? ["LUNCH", "DINNER"] : ["LUNCH"];

  function open(next: FormMode, d: OptionDraft = emptyDraft()) {
    setMode(next);
    setDraft(d);
    setFormKey((k) => k + 1);
  }
  const close = () => setMode(null);
  const payload = (slot: Slot) => ({
    slot,
    title: draft.title,
    description: draft.description,
    price: Number(draft.price),
    imageUrl: draft.imageUrl,
  });

  function submit(extra: { keep: boolean; date: string; slot: Slot }) {
    if (!mode) return;
    if (mode.kind === "add") {
      act(() => addWeeklyOptionAction(office, mode.weekday, payload(mode.slot), extra.keep), { success: "Option added", onOk: close });
    } else if (mode.kind === "edit") {
      act(() => updateOptionAction(mode.optionId, office, payload(mode.slot)), { success: "Option updated", onOk: close });
    } else {
      act(() => addDatedOptionAction(office, extra.date, payload(extra.slot), extra.keep), {
        success: `Meal published for ${fmtDay(extra.date)}`,
        onOk: close,
      });
    }
  }

  const heading =
    mode?.kind === "dated"
      ? "Publish for a specific date"
      : mode
        ? `${mode.kind === "edit" ? "Edit" : "Add"} · ${WEEKDAYS_LONG[mode.weekday]} · ${mode.slot}`
        : "";
  const badge = mode && mode.kind !== "dated" ? `Every ${WEEKDAYS_LONG[mode.weekday]}` : undefined;

  return (
    <div className="space-y-8">
      {/* Weekly schedule */}
      <section>
        <h2 className="font-display text-lg font-bold">Weekly schedule</h2>
        <p className="mb-3 mt-1 text-[11px] leading-relaxed text-ink-muted">
          Add several lunch (or dinner) options per weekday for <b className="text-ink">{scopeLabel}</b> (preview from {previewName}). They repeat every matching day.
          Everyone picks one option. Highlighted day is today (Asia/Dhaka). After a slot cutoff that meal closes until midnight — tomorrow does not appear
          automatically.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {WEEK_ORDER.map((wd) => {
            const isToday = wd === todayWeekday;
            return (
              <div
                key={wd}
                className={cn(
                  "rounded-2xl border p-2 text-center",
                  isToday ? "border-2 border-leaf/80 bg-leaf/[0.06] shadow-[0_0_24px_#2dd4bf22]" : "border-line bg-white/[0.02]",
                )}
              >
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-ink-muted">{WEEKDAYS_SHORT[wd]}</p>
                {isToday ? <Chip tone="leaf" className="mb-1.5">Today</Chip> : null}
                <div className="space-y-2">
                  {slots.map((slot) => {
                    const items = weekly.filter((w) => w.weekday === wd && w.slot === slot);
                    const addingHere = mode?.kind === "add" && mode.weekday === wd && mode.slot === slot;
                    return (
                      <div key={slot} className={cn("rounded-xl border border-white/5 bg-black/20 p-1.5 text-left", addingHere && "ring-1 ring-leaf/60")}>
                        <p className="mb-1 px-1 text-[9px] font-bold uppercase tracking-wider text-ink-muted">
                          {slot}
                          {items.length ? ` · ${items.length}` : ""}
                        </p>
                        <div className="space-y-1">
                          {items.map((it) => {
                            const editing = mode?.kind === "edit" && mode.optionId === it.id;
                            return (
                              <button
                                key={it.id}
                                type="button"
                                onClick={() =>
                                  open(
                                    { kind: "edit", optionId: it.id, weekday: wd, slot },
                                    { title: it.title, description: it.description ?? "", price: it.price, imageUrl: it.imageUrl },
                                  )
                                }
                                className={cn(
                                  "block w-full rounded-lg border border-white/5 bg-white/[0.04] px-2 py-1 text-left transition hover:bg-white/10",
                                  editing && "border-leaf/60 bg-leaf/10",
                                )}
                              >
                                <span className="block truncate text-[11px] font-bold">{it.title}</span>
                                <span className="block text-[9px] text-ink-muted">{taka(it.price)}</span>
                              </button>
                            );
                          })}
                        </div>
                        <button
                          type="button"
                          onClick={() => open({ kind: "add", weekday: wd, slot })}
                          className="mt-1 flex w-full items-center justify-center gap-1 rounded-lg py-1 text-[10px] font-semibold text-leaf hover:bg-leaf/10"
                        >
                          <Plus className="h-3 w-3" /> Add option
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Live today */}
      <section>
        <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-display text-sm font-bold">Live · {fmtDay(today)}</h2>
          <p className="text-[10px] text-ink-muted">Stock-out hides an option for that day only — restock to bring it back</p>
        </div>
        {live.length === 0 ? (
          <EmptyNote className="!py-3">No live options for this day yet.</EmptyNote>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {live.map((o) => (
              <li key={o.id} className="surface-card flex items-center justify-between gap-3 rounded-2xl px-4 py-2.5">
                <div className="min-w-0">
                  <p className={cn("truncate text-sm font-bold", o.stockedOut && "text-ink-muted line-through")}>{o.title}</p>
                  <p className="text-[11px] text-ink-muted">
                    {o.slot} · {o.office} · {taka(o.price)}
                  </p>
                </div>
                <button
                  className={cn("btn btn-sm", o.stockedOut ? "btn-leaf" : "btn-ghost")}
                  disabled={pending}
                  onClick={() => act(() => stockOutAction(o.id, today, !o.stockedOut, office), { success: o.stockedOut ? "Restocked" : "Marked out of stock" })}
                >
                  {o.stockedOut ? "Restock" : "Stock out"}
                </button>
              </li>
            ))}
          </ul>
        )}
        {mode?.kind !== "dated" ? (
          <button className="btn btn-ghost btn-sm mt-3" onClick={() => open({ kind: "dated" })}>
            <Plus className="h-3 w-3" /> Publish for a specific date
          </button>
        ) : null}
      </section>

      {/* Add / edit form */}
      {mode ? (
        <OptionForm
          key={formKey}
          mode={mode}
          heading={heading}
          badge={badge}
          draft={draft}
          onDraft={setDraft}
          busy={pending}
          scopeLabel={scopeLabel}
          offerDinner={offerDinner}
          minDate={today}
          onSubmit={submit}
          onRemove={mode.kind === "edit" ? () => setConfirmRemove(true) : undefined}
          onCancel={close}
        />
      ) : null}

      {/* Saved meals */}
      <section>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Saved meals</h2>
          <button className={cn("btn btn-sm", showArchived ? "btn-leaf" : "btn-ghost")} onClick={() => setShowArchived((s) => !s)}>
            {showArchived ? "Show active" : "Show archived"}
          </button>
        </div>
        <p className="mb-3 text-[11px] text-ink-muted">Tap Use to fill the weekday or dated form.</p>
        {(showArchived ? archived : saved).length === 0 ? (
          <EmptyNote className="!py-3">
            {showArchived ? "No archived meals." : 'No saved meals yet — publish with "Also keep in saved meals" checked.'}
          </EmptyNote>
        ) : (
          <ul className="grid gap-2.5 md:grid-cols-2">
            {(showArchived ? archived : saved).map((m) => (
              <li key={m.id} className="surface-card flex gap-3 rounded-2xl px-4 py-3">
                {m.imageUrl ? <Image src={m.imageUrl} alt="" width={44} height={44} unoptimized className="h-11 w-11 rounded-lg object-cover" /> : null}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{m.title}</p>
                  <p className="text-[11px] text-ink-muted">
                    {taka(m.price)}
                    {m.description ? ` · ${m.description}` : ""}
                  </p>
                  <div className="mt-2 flex gap-2">
                    {showArchived ? (
                      <button className="btn btn-leaf btn-sm" disabled={pending} onClick={() => act(() => archiveSavedMealAction(m.id, false), { success: "Meal restored" })}>
                        Restore
                      </button>
                    ) : (
                      <>
                        <button
                          className="btn btn-leaf btn-sm"
                          onClick={() => {
                            const d = { title: m.title, description: m.description ?? "", price: m.price, imageUrl: m.imageUrl };
                            if (mode && mode.kind !== "edit") {
                              setDraft(d);
                              setFormKey((k) => k + 1);
                            } else open({ kind: "dated" }, d);
                          }}
                        >
                          Use
                        </button>
                        <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => act(() => archiveSavedMealAction(m.id, true), { success: "Meal archived" })}>
                          Archive
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={confirmRemove}
        title="Remove this option?"
        text={`It will no longer appear on ${scopeLabel === "all locations" ? "any location's" : scopeLabel + "'s"} weekly menu.`}
        confirmLabel="Remove"
        danger
        busy={pending}
        onClose={() => setConfirmRemove(false)}
        onConfirm={() => {
          if (mode?.kind !== "edit") return;
          act(() => removeOptionAction(mode.optionId, office), {
            success: "Option removed",
            onOk: () => {
              setConfirmRemove(false);
              close();
            },
          });
        }}
      />
    </div>
  );
}
