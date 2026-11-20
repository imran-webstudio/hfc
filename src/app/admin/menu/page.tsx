import type { Slot } from "@prisma/client";
import { MenuStudio } from "@/components/admin/menu-studio";
import { prisma } from "@/lib/prisma";
import { officeScope, requireStaff } from "@/lib/session";
import { todayStr, weekOf, weekdayOf } from "@/lib/time";
import { fanOutOfficeIds, orderedQtyByOption, sharedWeeklyMenu } from "@/server/menu";
import { listOffices } from "@/server/offices";

export const metadata = { title: "Menu" };

export default async function AdminMenuPage({ searchParams }: { searchParams: Promise<{ office?: string; day?: string; slot?: string }> }) {
  const viewer = await requireStaff();
  const sp = await searchParams;
  // Deep link from the member home ("+ Add Menu" on an empty slot): preselect the
  // weekday and open the add form for that Lunch/Dinner slot directly.
  const dayNum = sp.day !== undefined && /^\d+$/.test(sp.day) ? Number(sp.day) : NaN;
  const initialDay = dayNum >= 0 && dayNum <= 6 ? dayNum : undefined;
  const initialSlot: Slot | undefined = sp.slot === "LUNCH" || sp.slot === "DINNER" ? (sp.slot as Slot) : undefined;
  const initialAdd = initialDay !== undefined && initialSlot ? { weekday: initialDay, slot: initialSlot } : null;
  const scope = officeScope(viewer);
  const offices = (await listOffices({ scope })).filter((o) => o.active);
  const officeIds = await fanOutOfficeIds(scope);
  const selected = sp.office && offices.some((o) => o.id === sp.office) ? sp.office : offices[0]?.id ?? "";
  const today = todayStr();
  const dishes = await sharedWeeklyMenu(officeIds, selected || undefined);
  const dates = weekOf(today);

  // Stock picture for the studio: for each weekday, the group-global ordered
  // quantity on that weekday's date this week, plus any manual stock-outs.
  const orderedById = new Map<string, number>();
  for (const wd of [...new Set(dishes.map((d) => d.weekday ?? 0))]) {
    const date = dates[wd];
    if (!date) continue;
    const m = await orderedQtyByOption(
      dishes.filter((d) => (d.weekday ?? 0) === wd).map((d) => d.id),
      date,
    );
    for (const [k, v] of m) orderedById.set(k, v);
  }
  const stockOutRows = await prisma.stockOut.findMany({
    where: { date: { in: Object.values(dates) } },
    select: { date: true, option: { select: { groupId: true } } },
  });
  const outSet = new Set(stockOutRows.map((s) => `${s.option.groupId}|${s.date}`));

  return (
    <>
      <h1 className="mb-4 text-3xl font-semibold tracking-tight lg:text-4xl">Menu</h1>
      <MenuStudio
      offices={offices.map((o) => ({ id: o.id, name: o.name, lunchCutoff: o.lunchCutoff, dinnerCutoff: o.dinnerCutoff }))}
      initialOfficeId={selected}
      today={today}
      todayWeekday={weekdayOf(today)}
      weekDates={dates}
      initialDay={initialDay}
      initialAdd={initialAdd}
      dishes={dishes.map((d) => ({
        id: d.id,
        weekday: d.weekday ?? 0,
        slot: d.slot,
        title: d.title,
        description: d.description,
        price: d.price,
        maxQuantity: d.maxQuantity,
        imageUrl: d.imageUrl,
        ordered: orderedById.get(d.id) ?? 0,
        stockedOut: outSet.has(`${d.groupId}|${dates[d.weekday ?? 0]}`),
      }))}
      />
    </>
  );
}
