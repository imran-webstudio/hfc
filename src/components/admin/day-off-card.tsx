"use client";

import { Sun, Moon } from "lucide-react";
import { setDayOffAction } from "@/actions/admin-team";
import { useAct } from "@/components/ui/use-act";
import { fmtDay } from "@/lib/time";

export function DayOffCard({ office, date, closed }: { office: string; date: string; closed: boolean }) {
  const { act, pending } = useAct();
  return (
    <div className="surface-card flex items-center justify-between gap-4 rounded-2xl px-5 py-4">
      <div className="flex items-center gap-3.5">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-leaf/15 text-leaf">{closed ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}</div>
        <div>
          <p className="text-sm font-bold">{closed ? "Day off is on" : "Catering is open"}</p>
          <p className="text-[11px] text-ink-muted">
            Meal day: <b className="text-ink">{fmtDay(date)}</b> —{" "}
            {closed ? "members can't order until you resume catering." : "turn on a day off when you're closed."}
          </p>
        </div>
      </div>
      <button
        className={closed ? "btn btn-leaf" : "btn btn-danger"}
        disabled={pending}
        onClick={() =>
          act(() => setDayOffAction(office, date, !closed), { success: closed ? "Catering resumed" : "Day off is on — ordering is paused" })
        }
      >
        {closed ? "Resume catering" : "Take day off"}
      </button>
    </div>
  );
}
