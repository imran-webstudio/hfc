import { OrderFood, type FoodSlot } from "@/components/member/slot-menu";
import { config } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/session";
import { WEEKDAYS_LONG, addDays, hhmmToMinutes, isDateStr, minutesNow, todayStr, weekdayOf } from "@/lib/time";
import { optionsForDate } from "@/server/menu";
import { isDayOff, slotState } from "@/server/orders";

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
  const dayOff = zone ? await isDayOff(zone.id, date) : false;
  const options = zone && !dayOff ? await optionsForDate(zone.id, date) : [];
  const mine = await prisma.order.findMany({
    where: { userId: viewer.id, mealDate: date, status: { not: "CANCELLED" } },
    orderBy: { createdAt: "desc" },
  });

  const slots: FoodSlot[] = (["LUNCH", "DINNER"] as const)
    .filter((s) => s === "LUNCH" || zone?.offerDinner)
    .map((slot) => {
      const state = zone ? slotState(zone, date, slot, dayOff) : { open: false, reason: "Choose your office in Profile" };
      const cutoff = slot === "LUNCH" ? (zone?.lunchCutoff ?? "13:00") : (zone?.dinnerCutoff ?? "20:00");
      const existing = mine.find((o) => o.slot === slot);
      return {
        slot,
        cutoff,
        open: state.open,
        reason: "reason" in state ? state.reason : dayOff ? "Catering is off" : undefined,
        closesLabel: closesLabel(date, cutoff, state.open),
        items: options
          .filter((o) => o.slot === slot)
          .map((o) => ({ id: o.id, title: o.title, description: o.description, price: o.price, imageUrl: o.imageUrl, remaining: o.remaining })),
        existing: existing
          ? { id: existing.id, title: existing.title, quantity: existing.quantity, amount: existing.amount, status: existing.status }
          : null,
      };
    });

  return <OrderFood dayName={WEEKDAYS_LONG[weekdayOf(date)]} date={date} place={place} balance={viewer.balance} slots={slots} />;
}
