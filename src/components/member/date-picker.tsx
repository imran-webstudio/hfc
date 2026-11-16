"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { dayParts, fmtDay } from "@/lib/time";
import { cn } from "@/lib/cn";

const toLocal = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const toStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Round date badge that opens the "Delivery date" calendar popover. */
export function DateBadge({ date, min, max, basePath = "/app" }: { date: string; min: string; max: string; basePath?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { day, mon } = dayParts(date);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-label="Change delivery date"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "grid h-11 w-11 place-items-center rounded-xl border text-center leading-none transition",
          open ? "border-leaf bg-leaf/15" : "border-leaf/30 bg-ink/[0.03] hover:bg-leaf/10",
        )}
      >
        <span>
          <span className="block text-sm font-extrabold">{day}</span>
          <span className="block text-[8px] font-bold tracking-wider text-ink-muted">{mon}</span>
        </span>
      </button>
      {open ? (
        <div className="surface-card absolute right-0 top-full z-40 mt-2 w-[19.5rem] rounded-2xl p-3 shadow-2xl">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Delivery date</p>
          <DayPicker
            mode="single"
            required
            selected={toLocal(date)}
            defaultMonth={toLocal(date)}
            disabled={[{ before: toLocal(min) }, { after: toLocal(max) }]}
            showOutsideDays
            weekStartsOn={0}
            formatters={{ formatWeekdayName: (d) => d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2).toUpperCase() }}
            onSelect={(d) => {
              if (!d) return;
              setOpen(false);
              router.push(`${basePath}?date=${toStr(d)}`);
            }}
          />
          <p className="mt-2 border-t border-line pt-2 text-center text-[11px] text-ink-muted">
            Selected <b className="text-leaf">{fmtDay(date)}</b>
          </p>
        </div>
      ) : null}
    </div>
  );
}
