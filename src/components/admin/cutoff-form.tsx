"use client";

import { useState } from "react";
import { saveCutoffsAction, setOfferDinnerAction } from "@/actions/admin-menu";
import { useAct } from "@/components/ui/use-act";

export function CutoffForm({ office, lunch, dinner, offerDinner, scopeLabel }: { office: string; lunch: string; dinner: string; offerDinner: boolean; scopeLabel: string }) {
  const { act, pending } = useAct();
  const [l, setL] = useState(lunch);
  const [d, setD] = useState(dinner);
  const [offer, setOffer] = useState(offerDinner);
  const all = office === "all";

  return (
    <div className="space-y-4">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          act(() => saveCutoffsAction(office, l, d), { success: "Cutoffs saved" });
        }}
      >
        <div className="w-36">
          <label className="field-label" htmlFor="lunch-cutoff">Lunch cutoff (24h, Asia/Dhaka)</label>
          <input id="lunch-cutoff" required className="input font-mono" placeholder="12:00" value={l} onChange={(e) => setL(e.target.value)} />
        </div>
        <div className="w-36">
          <label className="field-label" htmlFor="dinner-cutoff">Dinner cutoff (24h, Asia/Dhaka)</label>
          <input id="dinner-cutoff" required className="input font-mono" placeholder="18:00" value={d} onChange={(e) => setD(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-leaf" disabled={pending}>
          {all ? "Save cutoffs for all" : "Save cutoffs"}
        </button>
      </form>
      <p className="text-[11px] text-ink-muted">
        24-hour time (evening 6 PM = <b className="text-ink">18:00</b>). After midnight Dhaka time, yesterday&apos;s meals are gone.
      </p>
      <label className="surface-card flex cursor-pointer items-start gap-3 rounded-2xl px-4 py-3">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-[#2dd4bf]"
          checked={offer}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.checked;
            setOffer(next);
            act(() => setOfferDinnerAction(office, next), { success: next ? "Dinner is on" : "Dinner is off", onOk: () => undefined });
          }}
        />
        <span>
          <span className="block text-sm font-bold">Offer dinner</span>
          <span className="block text-[11px] text-ink-muted">{all ? "Applies to every active office" : `Applies to ${scopeLabel}`}</span>
        </span>
      </label>
    </div>
  );
}
