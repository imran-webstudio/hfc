import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { OfficeScope } from "@/server/offices";
import { memberScopeWhere } from "@/server/members";

export type DashboardFilters = { officeId?: string; floor?: string; date: string };

function scopedOfficeIds(scope: OfficeScope, officeId?: string): string[] | null {
  if (officeId && officeId !== "all") return scope && !scope.includes(officeId) ? [] : [officeId];
  return scope;
}

export async function dashboardStats(scope: OfficeScope, f: DashboardFilters) {
  const officeIds = scopedOfficeIds(scope, f.officeId);
  const floor = f.floor && f.floor !== "all" ? f.floor : undefined;

  const orderWhere: Prisma.OrderWhereInput = {
    mealDate: f.date,
    ...(officeIds ? { officeId: { in: officeIds } } : {}),
    ...(floor ? { user: { floor } } : {}),
  };
  const userWhere: Prisma.UserWhereInput = {
    banned: false,
    ...(officeIds ? { zoneId: { in: officeIds } } : memberScopeWhere(null)),
    ...(floor ? { floor } : {}),
  };

  const [orders, users, unpaidCash] = await Promise.all([
    prisma.order.findMany({
      where: orderWhere,
      include: { user: { select: { id: true, name: true, floor: true, desk: true, building: true, zone: { select: { name: true } } } } },
      orderBy: [{ slot: "asc" }, { createdAt: "asc" }],
    }),
    prisma.user.findMany({ where: userWhere, select: { id: true, balance: true } }),
    prisma.order.groupBy({
      by: ["userId"],
      where: { status: "DELIVERED", paymentStatus: { in: ["UNPAID", "DUE"] }, user: userWhere },
      _sum: { amount: true },
    }),
  ]);

  const live = orders.filter((o) => o.status !== "CANCELLED");
  const cashByUser = new Map(unpaidCash.map((u) => [u.userId, u._sum.amount ?? 0]));
  const dueByUser = users.map((u) => Math.max(0, -u.balance) + (cashByUser.get(u.id) ?? 0));

  // pack-by-item: slot + title → portions and who ordered
  const pack = new Map<string, { slot: string; title: string; portions: number; people: { orderId: string; name: string; zone: string; quantity: number; status: string }[] }>();
  for (const o of live) {
    const key = `${o.slot}|${o.title}`;
    const entry = pack.get(key) ?? { slot: o.slot, title: o.title, portions: 0, people: [] };
    entry.portions += o.quantity;
    entry.people.push({
      orderId: o.id,
      name: o.user.name ?? "Member",
      zone: [o.user.zone?.name ?? o.user.building, o.user.floor ? `Floor ${o.user.floor}` : null, o.user.desk ? `Desk ${o.user.desk}` : null]
        .filter(Boolean)
        .join(" · "),
      quantity: o.quantity,
      status: o.status,
    });
    pack.set(key, entry);
  }

  return {
    todaysOrders: live.length,
    portions: live.reduce((s, o) => s + o.quantity, 0),
    delivered: live.filter((o) => o.status === "DELIVERED").length,
    pending: live.filter((o) => o.status === "PENDING").length,
    totalSales: live.reduce((s, o) => s + o.amount, 0),
    activeUsers: users.length,
    usersWithDue: dueByUser.filter((d) => d > 0).length,
    outstandingDue: dueByUser.reduce((s, d) => s + d, 0),
    pack: [...pack.values()].sort((a, b) => a.slot.localeCompare(b.slot) || b.portions - a.portions),
  };
}

/** Is every office in scope on day-off for this date? */
export async function dayOffState(officeIds: string[], date: string) {
  if (!officeIds.length) return { closed: false, total: 0, off: 0 };
  const off = await prisma.dayOff.count({ where: { date, officeId: { in: officeIds } } });
  return { closed: off === officeIds.length, total: officeIds.length, off };
}

export async function setDayOff(officeIds: string[], date: string, off: boolean) {
  if (off) {
    await prisma.dayOff.createMany({ data: officeIds.map((officeId) => ({ officeId, date })), skipDuplicates: true });
  } else {
    await prisma.dayOff.deleteMany({ where: { date, officeId: { in: officeIds } } });
  }
}

export type DistributionFilters = { officeId?: string; floor?: string; date: string; q?: string };

export async function distributionOrders(scope: OfficeScope, f: DistributionFilters) {
  const officeIds = scopedOfficeIds(scope, f.officeId);
  const q = f.q?.trim();
  return prisma.order.findMany({
    where: {
      mealDate: f.date,
      ...(officeIds ? { officeId: { in: officeIds } } : {}),
      user: {
        ...(f.floor && f.floor !== "all" ? { floor: f.floor } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { employeeId: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
    },
    orderBy: [{ slot: "asc" }, { status: "asc" }, { createdAt: "asc" }],
    include: {
      office: { select: { name: true } },
      placedBy: { select: { name: true } },
      user: { select: { id: true, name: true, employeeId: true, floor: true, desk: true, building: true, accountType: true } },
    },
  });
}
