import { MenuStudio } from "@/components/admin/menu-studio";
import { prisma } from "@/lib/prisma";
import { officeScope, requireStaff } from "@/lib/session";
import { todayStr, weekOf, weekdayOf } from "@/lib/time";
import { fanOutOfficeIds, orderedQtyByOption, sharedWeeklyMenu } from "@/server/menu";
import { listOffices } from "@/server/offices";

export const metadata = { title: "Menu" };

export default async function AdminMenuPage({ searchParams }: { searchParams: Promise<{ office?: string }> }) {
  const viewer = await requireStaff();
  const sp = await searchParams;
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
    <MenuStudio
      offices={offices.map((o) => ({ id: o.id, name: o.name, lunchCutoff: o.lunchCutoff, dinnerCutoff: o.dinnerCutoff }))}
      initialOfficeId={selected}
      today={today}
      todayWeekday={weekdayOf(today)}
      weekDates={dates}
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
  );
}
