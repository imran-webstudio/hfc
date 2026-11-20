import { Suspense } from "react";
import { FilterDate, FilterSearch, FilterSelect } from "@/components/admin/filters";
import { type BoardOrder } from "@/components/admin/order-card";
import { OrdersTabs } from "@/components/admin/orders-tabs";
import { PhoneOrderSection } from "@/components/admin/phone-order-form";
import { config } from "@/lib/config";
import { officeScope, requireStaff } from "@/lib/session";
import { isDateStr, todayStr } from "@/lib/time";
import { memberFloors } from "@/server/members";
import { listOffices } from "@/server/offices";
import { distributionOrders } from "@/server/stats";

export const metadata = { title: "Orders" };

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ office?: string; floor?: string; date?: string; q?: string }> }) {
  const viewer = await requireStaff();
  const sp = await searchParams;
  const scope = officeScope(viewer);
  const offices = await listOffices({ scope });
  const today = todayStr();
  const date = isDateStr(sp.date) ? sp.date : today;
  const office = sp.office && offices.some((o) => o.id === sp.office) ? sp.office : "all";
  const floors = await memberFloors(scope, office !== "all" ? office : undefined);
  const floor = sp.floor && floors.includes(sp.floor) ? sp.floor : "all";
  const q = sp.q ?? "";

  const orders = await distributionOrders(scope, { officeId: office, floor, date, q });
  const rows: BoardOrder[] = orders.map((o) => ({
    id: o.id,
    memberId: o.user.id,
    memberName: o.user.name ?? "Member",
    employeeId: o.user.employeeId,
    place: [o.office.name, o.user.floor ? `F${o.user.floor}` : null, o.user.desk ? `Desk ${o.user.desk}` : null].filter(Boolean).join(" · "),
    officeId: o.officeId,
    mealDate: o.mealDate,
    lines: o.items.map((i) => ({ title: i.title, slot: i.slot, quantity: i.quantity, subtotal: i.subtotal })),
    editLines: o.items.map((i) => ({ optionId: i.optionId, title: i.title, quantity: i.quantity, subtotal: i.subtotal })),
    amount: o.amount,
    status: o.status,
    paymentStatus: o.paymentStatus,
    note: o.note,
    placedBy: o.placedBy?.name ?? null,
    deliveredLabel: o.deliveredAt
      ? `Delivered ${new Date(o.deliveredAt).toLocaleTimeString("en-US", { timeZone: "Asia/Dhaka", hour: "numeric", minute: "2-digit" })}`
      : o.status === "DELIVERED"
        ? "Delivered"
        : null,
  }));

  // Filter stack, in the order the user asked for: Office + Floor on one line,
  // the date filter full-width on the next line, then search full-width.
  const filters = (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <FilterSelect
          bare
          param="office"
          label="Office"
          value={office}
          options={[{ value: "all", label: "All offices" }, ...offices.map((o) => ({ value: o.id, label: o.name }))]}
        />
        <FilterSelect
          bare
          param="floor"
          label="Floor"
          value={floor}
          options={[{ value: "all", label: "All floors" }, ...floors.map((f) => ({ value: f, label: `F${f}` }))]}
        />
      </div>
      <FilterDate bare param="date" label="Date" value={date} />
      <Suspense>
        <FilterSearch bare param="q" label="Search" value={q} placeholder="Search orders" className="w-full" />
      </Suspense>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-3xl font-semibold tracking-tight lg:text-4xl">Orders</h1>

      <Suspense>
        <OrdersTabs
          orders={rows}
          filters={filters}
          action={<PhoneOrderSection offices={offices.filter((o) => o.active).map((o) => ({ id: o.id, name: o.name }))} today={today} maxDays={config.maxAdvanceDays} />}
        />
      </Suspense>
    </div>
  );
}
