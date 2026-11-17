import { Suspense } from "react";
import { FilterSearch, FilterSelect } from "@/components/admin/filters";
import { UsersBoard, type UserRow } from "@/components/admin/user-card";
import { floorLabel } from "@/lib/floors";
import { prisma } from "@/lib/prisma";
import { officeScope, requireStaff } from "@/lib/session";
import { listMembers, memberFloors } from "@/server/members";
import { listOffices } from "@/server/offices";

export const metadata = { title: "Users & deposits" };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ zone?: string; floor?: string; q?: string }> }) {
  const viewer = await requireStaff();
  const sp = await searchParams;
  const scope = officeScope(viewer);
  const [offices, floors] = await Promise.all([listOffices({ scope }), memberFloors(scope)]);
  const zone = sp.zone === "none" || offices.some((o) => o.id === sp.zone) ? (sp.zone as string) : "all";
  const floor = sp.floor && floors.includes(sp.floor) ? sp.floor : "all";
  const q = sp.q ?? "";

  const members = await listMembers(scope, { zone, floor, q });
  const [cash, managers] = await Promise.all([
    prisma.order.groupBy({
      by: ["userId"],
      where: { userId: { in: members.map((m) => m.id) }, status: "DELIVERED", paymentStatus: { in: ["UNPAID", "DUE"] } },
      _sum: { amount: true },
    }),
    prisma.officeManager.findMany({ where: { userId: { in: members.map((m) => m.id) } }, select: { userId: true } }),
  ]);
  const cashBy = new Map(cash.map((c) => [c.userId, c._sum.amount ?? 0]));
  const managerIds = new Set(managers.map((m) => m.userId));

  const rows: UserRow[] = members.map((m) => ({
    id: m.id,
    name: m.name ?? m.email ?? "Member",
    role: m.role,
    isManager: managerIds.has(m.id),
    banned: m.banned,
    accountType: m.accountType,
    zoneId: m.zoneId,
    balance: m.balance,
    due: Math.max(0, -m.balance) + (cashBy.get(m.id) ?? 0),
    employeeId: m.employeeId,
    officeName: m.zone?.name ?? null,
    floor: m.floor,
  }));

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 hidden text-3xl font-semibold tracking-tight lg:block lg:text-4xl">Users & deposits</h1>
      <UsersBoard
        rows={rows}
        search={
          <Suspense>
            <FilterSearch bare param="q" label="Search" value={q} placeholder="Name or employee ID" className="w-full" />
          </Suspense>
        }
        filters={
          <Suspense>
            <>
              <FilterSelect
                bare
                param="zone"
                label="Office"
                value={zone}
                options={[
                  { value: "all", label: "All offices" },
                  { value: "none", label: "Unassigned" },
                  ...offices.map((o) => ({ value: o.id, label: o.name })),
                ]}
              />
              <FilterSelect bare param="floor" label="Floor" value={floor} options={[{ value: "all", label: "All floors" }, ...floors.map((f) => ({ value: f, label: floorLabel(f) }))]} />
            </>
          </Suspense>
        }
      />
    </div>
  );
}
