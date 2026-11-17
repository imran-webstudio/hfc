import Link from "next/link";
import { Clock, MapPin, User, UtensilsCrossed } from "lucide-react";
import { DateBadge } from "@/components/member/date-picker";
import { SlotMenu } from "@/components/member/slot-menu";
import { EmptyNote } from "@/components/ui/ui";
import { config } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/session";
import { addDays, fmtDay, isDateStr, todayStr } from "@/lib/time";
import { optionsForDate } from "@/server/menu";
import { isDayOff, slotState } from "@/server/orders";

export const metadata = { title: "Today" };

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const viewer = await requireViewer();
  const { date: dateParam } = await searchParams;
  const today = todayStr();
  const max = addDays(today, config.maxAdvanceDays);
  const date = isDateStr(dateParam) && dateParam >= today && dateParam <= max ? dateParam : today;

  const zone = viewer.zone;
  const firstName = (viewer.name ?? "there").split(" ")[0];
  const place = [zone?.name, viewer.floor ? `${viewer.floor} Floor` : null, viewer.desk ? `Desk ${viewer.desk}` : null]
    .filter(Boolean)
    .join(", ");

  const dayOff = zone ? await isDayOff(zone.id, date) : false;
  const lunch = zone ? slotState(zone, date, "LUNCH", dayOff) : { open: false };
  const dinner = zone ? slotState(zone, date, "DINNER", dayOff) : { open: false };
  const options = zone ? await optionsForDate(zone.id, date) : [];
  const mine = await prisma.order.findMany({
    where: { userId: viewer.id, mealDate: date, status: { not: "CANCELLED" } },
    orderBy: { createdAt: "desc" },
  });

  const anyOpen = lunch.open || dinner.open;
  const statusTitle = !zone ? "Choose your office" : dayOff ? "Catering is off" : anyOpen ? "Order open" : "Orders closed";
  const statusTone = !zone || !anyOpen ? "text-amber-300" : "text-leaf";

  const slots = (["LUNCH", "DINNER"] as const).filter((s) => s === "LUNCH" || zone?.offerDinner);
  const sections = slots
    .map((slot) => ({
      slot,
      items: options.filter((o) => o.slot === slot),
      state: slot === "LUNCH" ? lunch : dinner,
      existing: mine.find((o) => o.slot === slot) ?? null,
    }))
    .filter((s) => s.items.length > 0 || s.existing);

  return (
    <div className="space-y-4">
      <div className="surface-card flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-4">
        <div className="flex items-center gap-4">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-leaf/15 text-leaf">
            <User className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-lg font-bold">Hello, {firstName} 👋</p>
            <p className="text-xs text-ink-muted">Have a good meal! 😊</p>
          </div>
        </div>
        <div className="flex max-w-xs items-start gap-2.5 border-l border-line pl-5">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-leaf" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-leaf">Your zone</p>
            <p className="text-sm font-semibold leading-snug">
              {place || (
                <Link href="/app/profile" className="text-spice-deep underline">
                  Complete your profile
                </Link>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="surface-card relative z-30 flex items-center justify-between gap-4 rounded-2xl px-5 py-4">
        <div className="flex items-center gap-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-leaf/15 text-leaf">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className={`text-sm font-bold ${statusTone}`}>{statusTitle}</p>
            <p className="text-xs text-ink-muted">
              Lunch <b className="text-ink">{fmtDay(date)}</b> · Dinner <b className="text-ink">{fmtDay(date)}</b>
            </p>
            <p className="text-xs text-ink-muted">
              Lunch closes at {zone?.lunchCutoff ?? "13:00"}, dinner at {zone?.dinnerCutoff ?? "20:00"}. Tap the date badge to pre-order another day.
            </p>
          </div>
        </div>
        <DateBadge date={date} min={today} max={max} />
      </div>

      <div>
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <UtensilsCrossed className="h-4 w-4 text-leaf" /> Menu
        </h2>
        <p className="mb-3 mt-0.5 text-xs text-ink-muted">Lunch and dinner are listed separately. Choose and set quantity.</p>

        {!zone ? (
          <EmptyNote>
            Pick your office in{" "}
            <Link href="/app/profile" className="text-leaf underline">
              your profile
            </Link>{" "}
            to see the menu.
          </EmptyNote>
        ) : dayOff ? (
          <EmptyNote>Catering is off at {zone.name} on {fmtDay(date)}.</EmptyNote>
        ) : sections.length === 0 ? (
          <EmptyNote>No published meals right now at {zone.name}.</EmptyNote>
        ) : (
          <div className="space-y-3">
            {sections.map(({ slot, items, state, existing }) => (
              <SlotMenu
                key={`${date}-${slot}`}
                slot={slot}
                date={date}
                items={items.map((o) => ({
                  id: o.id,
                  title: o.title,
                  description: o.description,
                  price: o.price,
                  imageUrl: o.imageUrl,
                  remaining: o.remaining,
                }))}
                open={state.open}
                reason={"reason" in state ? state.reason : undefined}
                cutoff={slot === "LUNCH" ? zone.lunchCutoff : zone.dinnerCutoff}
                existing={existing ? { id: existing.id, title: existing.title, quantity: existing.quantity, amount: existing.amount, status: existing.status } : null}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
