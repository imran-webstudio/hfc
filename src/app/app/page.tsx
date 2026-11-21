import { OrderFood, type FoodSlot } from "@/components/member/slot-menu";
import { config } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/session";
import { WEEKDAYS_LONG, addDays, fmtFullDate, hhmmToMinutes, isDateStr, minutesNow, todayStr, weekdayOf } from "@/lib/time";
import { optionsForDate } from "@/server/menu";
import { slotState } from "@/server/orders";

export const metadata = { title: "Order food" };

function closesLabel(date: string, cutoff: string, open: boolean) {
  if (!open) return null;
  if (date !== todayStr()) return `Closes ${cutoff}`;
  const mins = hhmmToMinutes(cutoff) - minutesNow();
  if (mins <= 0) return `Closes ${cutoff}`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `Closes in ${h}h ${m}m` : `Closes in ${m}m`;
}

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const viewer = await requireViewer();
  const { date: dateParam } = await searchParams;
  const today = todayStr();
  const max = addDays(today, config.maxAdvanceDays);
  const date = isDateStr(dateParam) && dateParam >= today && dateParam <= max ? dateParam : today;
  const zone = viewer.zone;
  const place = [zone?.name, viewer.floor ? `F${viewer.floor}` : null, viewer.desk ? `Desk ${viewer.desk}` : null].filter(Boolean).join(" · ");
  // Day-off row carries the admin's notice note — members must SEE it on the
  // home page (Service Notice banner), not just find the slots closed.
  const offRow = zone ? await prisma.dayOff.findUnique({ where: { officeId_date: { officeId: zone.id, date } } }) : null;
  const dayOff = !!offRow;
  // Members see stocked-out dishes too (flagged "Stock Out"), but NEVER numeric stock:
  // only the `available` boolean crosses into the member payload (spec §5/§14.3).
  const options = zone && !dayOff ? await optionsForDate(zone.id, date, { includeStockedOut: true }) : [];
  const mine = await prisma.order.findMany({
    where: { userId: viewer.id, mealDate: date, status: { not: "CANCELLED" } },
    orderBy: { createdAt: "desc" },
    include: { items: { include: { option: { select: { imageUrl: true } } } } },
  });

  const slots: FoodSlot[] = (["LUNCH", "DINNER"] as const)
    .filter((s) => s === "LUNCH" || zone?.offerDinner)
    .map((slot) => {
      const state = zone ? slotState(zone, date, slot, dayOff) : { open: false, reason: "Choose your office in Profile" };
      const cutoff = slot === "LUNCH" ? (zone?.lunchCutoff ?? "13:00") : (zone?.dinnerCutoff ?? "20:00");
      return {
        slot,
        cutoff,
        open: state.open,
        reason: "reason" in state ? state.reason : dayOff ? "Catering is off" : undefined,
        closesLabel: closesLabel(date, cutoff, state.open),
        items: options
          .filter((o) => o.slot === slot)
          .map((o) => ({ id: o.id, title: o.title, description: o.description, price: o.price, imageUrl: o.imageUrl, available: o.available })),
      };
    });

  const existing = mine.map((o) => ({
    id: o.id,
    title: o.items.map((i) => i.title).join(", ") || "Order",
    quantity: o.items.reduce((q, i) => q + i.quantity, 0),
    itemCount: o.items.length,
    amount: o.amount,
    status: o.status,
    paymentStatus: o.paymentStatus,
    imageUrl: o.items[0]?.option?.imageUrl ?? null,
  }));

  return (
    <OrderFood
      dayName={WEEKDAYS_LONG[weekdayOf(date)]}
      fullDate={fmtFullDate(date)}
      isToday={date === today}
      weekday={weekdayOf(date)}
      isStaff={viewer.isStaff}
      date={date}
      place={place}
      cateringOff={dayOff}
      offNote={offRow?.note ?? null}
      balance={viewer.balance}
      slots={slots}
      existing={existing}
    />
  );
}
