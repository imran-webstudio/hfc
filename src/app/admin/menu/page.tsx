import { MenuStudio } from "@/components/admin/menu-studio";
import { officeScope, requireStaff } from "@/lib/session";
import { todayStr, weekOf, weekdayOf } from "@/lib/time";
import { fanOutOfficeIds, sharedWeeklyMenu } from "@/server/menu";
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
      }))}
    />
  );
}
