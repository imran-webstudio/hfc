import { DashboardHome } from "@/components/admin/dashboard-home";
import { floorLabel } from "@/lib/floors";
import { prisma } from "@/lib/prisma";
import { officeScope, requireStaff } from "@/lib/session";
import { todayStr, weekdayOf } from "@/lib/time";
import { memberFloors } from "@/server/members";
import { listOffices } from "@/server/offices";
import { dashboardStats, dayOffBanner } from "@/server/stats";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ office?: string; floor?: string }> }) {
  const viewer = await requireStaff();
  const sp = await searchParams;
  const scope = officeScope(viewer);
  const offices = await listOffices({ scope });
  const office = sp.office && offices.some((o) => o.id === sp.office) ? sp.office : "all";
  const floors = await memberFloors(scope, office);
  const floor = sp.floor && floors.includes(sp.floor) ? sp.floor : "all";
  const date = todayStr();

  const stats = await dashboardStats(scope, { officeId: office, floor, date });
  const targets = office === "all" ? offices.filter((o) => o.active) : offices.filter((o) => o.id === office);
  const targetIds = targets.map((o) => o.id);
  const dayOff = await dayOffBanner(targetIds, date);
  const publishedToday = await prisma.menuOption.count({
    where: { officeId: { in: targetIds }, active: true, OR: [{ date }, { date: null, weekday: weekdayOf(date) }] },
  });

  const lunches = targets.map((o) => o.lunchCutoff).sort();
  const dinners = targets.map((o) => o.dinnerCutoff).sort();

  return (
    <DashboardHome
      date={date}
      office={office}
      floor={floor}
      offices={offices.map((o) => ({ value: o.id, label: o.name }))}
      floors={floors.map((f) => ({ value: f, label: floorLabel(f) }))}
      lunchCutoff={lunches[0] ?? "—"}
      dinnerCutoff={dinners[0] ?? "—"}
      published={publishedToday > 0}
      closed={dayOff.closed}
      partial={dayOff.partial}
      offToday={dayOff.offToday}
      officeCount={dayOff.total}
      note={dayOff.note}
      offFrom={dayOff.from}
      offTo={dayOff.to}
      stats={stats}
    />
  );
}
