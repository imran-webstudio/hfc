import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardList, DollarSign, Users, UserCheck, Wallet } from "lucide-react";
import { DayOffCard } from "@/components/admin/day-off-card";
import { FilterSelect } from "@/components/admin/filters";
import { PackList } from "@/components/admin/pack-list";
import { EmptyNote, StatCard } from "@/components/ui/ui";
import { floorLabel } from "@/lib/floors";
import { taka } from "@/lib/money";
import { officeScope, requireStaff } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { todayStr, weekdayOf } from "@/lib/time";
import { memberFloors } from "@/server/members";
import { listOffices } from "@/server/offices";
import { dashboardStats, dayOffState } from "@/server/stats";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ office?: string; floor?: string }> }) {
  const viewer = await requireStaff();
  const sp = await searchParams;
  const scope = officeScope(viewer);
  const [offices, floors] = await Promise.all([listOffices({ scope }), memberFloors(scope)]);
  const office = sp.office && offices.some((o) => o.id === sp.office) ? sp.office : "all";
  const floor = sp.floor && floors.includes(sp.floor) ? sp.floor : "all";
  const date = todayStr();

  const stats = await dashboardStats(scope, { officeId: office, floor, date });
  const targetIds = office === "all" ? offices.filter((o) => o.active).map((o) => o.id) : [office];
  const dayOff = await dayOffState(targetIds, date);
  const publishedToday = await prisma.menuOption.count({
    where: { officeId: { in: targetIds }, active: true, OR: [{ date }, { date: null, weekday: weekdayOf(date) }] },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-xs text-ink-muted">Today&apos;s snapshot across your offices.</p>
        </div>
        <div className="flex gap-3">
          <FilterSelect
            param="office"
            label="Office / Building"
            value={office}
            className="w-52"
            options={[{ value: "all", label: "All my locations" }, ...offices.map((o) => ({ value: o.id, label: o.name }))]}
          />
          <FilterSelect
            param="floor"
            label="Floor"
            value={floor}
            className="w-40"
            options={[{ value: "all", label: "All floors" }, ...floors.map((f) => ({ value: f, label: floorLabel(f) }))]}
          />
        </div>
      </div>

      <DayOffCard office={office} date={date} closed={dayOff.closed} />

      <div className="surface-card flex items-center justify-between gap-4 rounded-2xl px-5 py-4">
        <div>
          <p className="text-sm font-bold text-leaf">Order window</p>
          <p className="text-[11px] text-ink-muted">Review today&apos;s distribution and settle payments.</p>
        </div>
        <Link href="/admin/orders" className="btn btn-leaf gap-2">
          View today&apos;s orders <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Today's Orders" value={stats.todaysOrders} icon={<ClipboardList className="h-3.5 w-3.5" />} />
        <StatCard label="Portions to pack" value={stats.portions} icon={<ClipboardList className="h-3.5 w-3.5" />} />
        <StatCard label="Delivered" value={stats.delivered} icon={<ClipboardList className="h-3.5 w-3.5" />} />
        <StatCard label="Pending" value={stats.pending} icon={<ClipboardList className="h-3.5 w-3.5" />} />
        <StatCard label="Total Sales" value={taka(stats.totalSales)} icon={<DollarSign className="h-3.5 w-3.5" />} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Active users" value={stats.activeUsers} icon={<Users className="h-3.5 w-3.5" />} />
        <StatCard label="Users with due" value={stats.usersWithDue} icon={<UserCheck className="h-3.5 w-3.5" />} />
        <StatCard label="Outstanding due" value={taka(stats.outstandingDue)} icon={<Wallet className="h-3.5 w-3.5" />} />
      </div>

      <div>
        <h2 className="mb-2 font-display text-base font-bold">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <QuickAction href="/admin/orders" icon={<ClipboardList className="h-4 w-4" />} title="Today's Orders" text="Mark delivered, charge wallet, cash paid" />
          <QuickAction href="/admin/menu" icon={<BookOpen className="h-4 w-4" />} title="Menu" text="Weekly schedule & dated meals" />
          <QuickAction href="/admin/users" icon={<Users className="h-4 w-4" />} title="Customers" text="Regular / one-time, deposits" />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-end justify-between">
          <div>
            <h2 className="font-display text-base font-bold">Pack by item</h2>
            <p className="text-[11px] text-ink-muted">Tap a dish to see who ordered it and their zone.</p>
          </div>
          <Link href="/admin/orders" className="text-[11px] font-semibold text-leaf hover:underline">
            Orders
          </Link>
        </div>
        {stats.pack.length === 0 ? <EmptyNote>{publishedToday === 0 ? "No menus published for today yet." : "No orders yet for today's menus."}</EmptyNote> : <PackList items={stats.pack} />}
      </div>
    </div>
  );
}

function QuickAction({ href, icon, title, text }: { href: string; icon: React.ReactNode; title: string; text: string }) {
  return (
    <Link href={href} className="surface-card group relative block rounded-2xl p-4 transition hover:border-leaf/40">
      <ArrowRight className="absolute right-4 top-4 h-3.5 w-3.5 text-ink-muted transition group-hover:translate-x-0.5 group-hover:text-leaf" />
      <div className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-leaf/15 text-leaf">{icon}</div>
      <p className="text-sm font-bold">{title}</p>
      <p className="text-[11px] text-ink-muted">{text}</p>
    </Link>
  );
}
