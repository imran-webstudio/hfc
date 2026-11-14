import { Users } from "lucide-react";
import { FilterSearch, FilterSelect } from "@/components/admin/filters";
import { UserCard, type UserRow } from "@/components/admin/user-card";
import { EmptyNote, PageTitle } from "@/components/ui/ui";
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
    wrote: [
      m.address ? `Wrote: ${m.address}` : null,
      m.employeeId,
      m.building ? `Bldg ${m.building}` : null,
      m.floor ? `Fl ${m.floor}` : null,
      m.desk ? `Desk ${m.desk}` : null,
    ]
      .filter(Boolean)
      .join(" · "),
  }));

  return (
    <div className="mx-auto max-w-6xl">
      <PageTitle icon={<Users className="h-5 w-5" />} title="Users & deposits">
        Assign catering zones. Set Regular / One-time. Deposit, ban, or permanently delete members.
      </PageTitle>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <FilterSelect
          param="zone"
          label="Zone"
          value={zone}
          options={[
            { value: "all", label: "All zones" },
            { value: "none", label: "Unassigned (no zone)" },
            ...offices.map((o) => ({ value: o.id, label: o.name })),
          ]}
        />
        <FilterSelect param="floor" label="Floor" value={floor} options={[{ value: "all", label: "All floors" }, ...floors.map((f) => ({ value: f, label: floorLabel(f) }))]} />
        <FilterSearch param="q" label="Search" value={q} placeholder="Name, email, employee ID" />
      </div>

      {rows.length === 0 ? (
        <EmptyNote>No members match these filters.</EmptyNote>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((u) => (
            <UserCard key={u.id} u={u} offices={offices.map((o) => ({ id: o.id, name: o.name }))} canAssignNone={viewer.isSuperAdmin} />
          ))}
        </ul>
      )}
    </div>
  );
}
