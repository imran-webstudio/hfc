import { ClipboardList } from "lucide-react";
import { FilterDate, FilterSearch, FilterSelect } from "@/components/admin/filters";
import { OrderCard } from "@/components/admin/order-card";
import { PhoneOrderSection } from "@/components/admin/phone-order-form";
import { PageTitle } from "@/components/ui/ui";
import { config } from "@/lib/config";
import { floorLabel } from "@/lib/floors";
import { officeScope, requireStaff } from "@/lib/session";
import { isDateStr, todayStr } from "@/lib/time";
import { memberFloors } from "@/server/members";
import { listOffices } from "@/server/offices";
import { distributionOrders } from "@/server/stats";

export const metadata = { title: "Distribution board" };

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ office?: string; floor?: string; date?: string; q?: string }> }) {
  const viewer = await requireStaff();
  const sp = await searchParams;
  const scope = officeScope(viewer);
  const [offices, floors] = await Promise.all([listOffices({ scope }), memberFloors(scope)]);
  const today = todayStr();
  const date = isDateStr(sp.date) ? sp.date : today;
  const office = sp.office && offices.some((o) => o.id === sp.office) ? sp.office : "all";
  const floor = sp.floor && floors.includes(sp.floor) ? sp.floor : "all";
  const q = sp.q ?? "";

  const orders = await distributionOrders(scope, { officeId: office, floor, date, q });

  return (
    <div className="mx-auto max-w-6xl">
      <PageTitle icon={<ClipboardList className="h-5 w-5" />} title="Distribution board">
        Mark delivered when food is handed over. Regular: Charge Wallet after delivery. One-time: Cash Paid or Due. Place phone orders below.
      </PageTitle>

      <PhoneOrderSection offices={offices.filter((o) => o.active).map((o) => ({ id: o.id, name: o.name }))} today={today} maxDays={config.maxAdvanceDays} />

      <div className="mb-5 flex flex-wrap gap-3">
        <FilterSelect
          param="office"
          label="Location"
          value={office}
          className="w-44"
          options={[{ value: "all", label: "All offices" }, ...offices.map((o) => ({ value: o.id, label: o.name }))]}
        />
        <FilterSelect
          param="floor"
          label="Floor"
          value={floor}
          className="w-40"
          options={[{ value: "all", label: "All floors" }, ...floors.map((f) => ({ value: f, label: floorLabel(f) }))]}
        />
        <FilterDate param="date" label="Date" value={date} className="w-40" />
        <FilterSearch param="q" label="Search member" value={q} placeholder="Name or employee ID" className="w-52" />
      </div>

      {orders.length === 0 ? (
        <p className="text-xs text-ink-muted">No orders for this day.</p>
      ) : (
        <ul className="space-y-2.5">
          {orders.map((o) => (
            <OrderCard
              key={o.id}
              o={{
                id: o.id,
                memberId: o.user.id,
                memberName: o.user.name ?? "Member",
                employeeId: o.user.employeeId,
                place: [o.office.name, o.user.floor ? `Floor ${o.user.floor}` : null, o.user.desk ? `Desk ${o.user.desk}` : null].filter(Boolean).join(" · "),
                accountType: o.user.accountType,
                slot: o.slot,
                title: o.title,
                quantity: o.quantity,
                amount: o.amount,
                status: o.status,
                paymentStatus: o.paymentStatus,
                note: o.note,
                placedBy: o.placedBy?.name ?? null,
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
