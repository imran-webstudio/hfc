import { Suspense } from "react";
import { FilterSearch, FilterSelect } from "@/components/admin/filters";
import { UsersBoard, type UserRow } from "@/components/admin/user-card";
import { floorLabel } from "@/lib/floors";
import { prisma } from "@/lib/prisma";
import { officeScope, requireStaff } from "@/lib/session";
import { listMembers, memberFloors } from "@/server/members";
import { listOffices } from "@/server/offices";

export const metadata = { title: "Users & deposits" };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ zone?: string; floor?: string; q?: string; balance?: string }> }) {
  const viewer = await requireStaff();
  const sp = await searchParams;
  const scope = officeScope(viewer);
  const offices = await listOffices({ scope });
  const zone = sp.zone === "none" || offices.some((o) => o.id === sp.zone) ? (sp.zone as string) : "all";
  const floors = await memberFloors(scope, zone !== "all" && zone !== "none" ? zone : undefined);
  const floor = sp.floor && floors.includes(sp.floor) ? sp.floor : "all";
  const q = sp.q ?? "";
  const balance = sp.balance === "due" || sp.balance === "credit" ? sp.balance : "all";

  const members = await listMembers(scope, { zone, floor, q, balance });
  // Headline Due/Credit totals cover every member in scope, not the filtered list.
  const allMembers = await listMembers(scope, {});
  const totals = {
    due: allMembers.reduce((s, m) => s + Math.max(0, -m.balance), 0),
    credit: allMembers.reduce((s, m) => s + Math.max(0, m.balance), 0),
  };
  const managers = await prisma.officeManager.findMany({ where: { userId: { in: members.map((m) => m.id) } }, select: { userId: true } });
  const managerIds = new Set(managers.map((m) => m.userId));

  const rows: UserRow[] = members.map((m) => ({
    id: m.id,
    name: m.name ?? m.email ?? "Member",
    role: m.role,
    isManager: managerIds.has(m.id),
    banned: m.banned,
    zoneId: m.zoneId,
    balance: m.balance,
    // Due is simply the negative part of the balance (bills land at delivery;
    // pending orders are not part of the balance yet).
    due: Math.max(0, -m.balance),
    employeeId: m.employeeId,
    officeName: m.zone?.name ?? null,
    floor: m.floor,
  }));

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-3xl font-semibold tracking-tight lg:text-4xl">Users & deposits</h1>
      <UsersBoard
        rows={rows}
        totals={totals}
        balance={balance}
        controls={
          // Control stack in the user's order: Office, Floor, Search, Balance.
          <Suspense>
            <div className="space-y-2">
              <FilterSelect
                bare
                large
                param="zone"
                label="Office"
                value={zone}
                options={[
                  { value: "all", label: "All offices" },
                  { value: "none", label: "Unassigned" },
                  ...offices.map((o) => ({ value: o.id, label: o.name })),
                ]}
              />
              <FilterSelect bare large param="floor" label="Floor" value={floor} options={[{ value: "all", label: "All floors" }, ...floors.map((f) => ({ value: f, label: floorLabel(f) }))]} />
              <FilterSearch bare large param="q" label="Search" value={q} placeholder="Job ID, name or mobile number" className="w-full" />
              <FilterSelect
                bare
                large
                param="balance"
                label="Balance"
                value={balance}
                options={[
                  { value: "all", label: "All balances" },
                  { value: "due", label: "With due" },
                  { value: "credit", label: "With credit" },
                ]}
              />
            </div>
          </Suspense>
        }
      />
    </div>
  );
}
