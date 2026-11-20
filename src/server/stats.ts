import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { UserError } from "@/lib/action";
import { addDays, isDateStr } from "@/lib/time";
import { listOffices, type OfficeScope } from "@/server/offices";
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

  const [orders, users] = await Promise.all([
    prisma.order.findMany({
      where: orderWhere,
      include: {
        office: { select: { id: true, name: true } },
        items: { include: { option: { select: { imageUrl: true } } } },
        user: { select: { id: true, name: true, floor: true, desk: true } },
      },
      orderBy: [{ createdAt: "asc" }],
    }),
    prisma.user.findMany({ where: userWhere, select: { id: true, balance: true } }),
  ]);

  const live = orders.filter((o) => o.status !== "CANCELLED");

  let creditBalance = 0;
  let outstandingDue = 0;
  let usersWithDue = 0;
  for (const u of users) {
    if (u.balance > 0) creditBalance += u.balance;
    else if (u.balance < 0) {
      outstandingDue += -u.balance;
      usersWithDue += 1;
    }
  }

  // Pack by dish + meal + office so who/where stays meaningful when the filter is All.
  const pack = new Map<
    string,
    {
      key: string;
      slot: string;
      title: string;
      officeName: string;
      imageUrl: string | null;
      orders: number;
      portions: number;
      amount: number;
      people: { orderId: string; name: string; floor: string | null; desk: string | null; quantity: number; status: string }[];
    }
  >();
  for (const o of live) {
    for (const item of o.items) {
      const key = `${item.slot}|${item.title}|${o.officeId}`;
      const entry = pack.get(key) ?? {
        key,
        slot: item.slot,
        title: item.title,
        officeName: o.office.name,
        imageUrl: item.option?.imageUrl ?? null,
        orders: 0,
        portions: 0,
        amount: 0,
        people: [],
      };
      entry.orders += 1;
      entry.portions += item.quantity;
      entry.amount += item.subtotal;
      if (!entry.imageUrl && item.option?.imageUrl) entry.imageUrl = item.option.imageUrl;
      entry.people.push({
        orderId: o.id,
        name: o.user.name ?? "Member",
        floor: o.user.floor,
        desk: o.user.desk,
        quantity: item.quantity,
        status: o.status,
      });
      pack.set(key, entry);
    }
  }

  // "Total Cash Paid" (spec §3.4) = cash collected on the dashboard date (by paidAt,
  // Asia/Dhaka), across orders in scope — not merely cash-paid orders for that meal date.
  const dhakaDate = (d: Date) => new Date(d.getTime() + 6 * 3600_000).toISOString().slice(0, 10);
  const cashRows = await prisma.order.findMany({
    where: {
      paymentStatus: "CASH_PAID",
      paidAt: { not: null },
      ...(officeIds ? { officeId: { in: officeIds } } : {}),
      ...(floor ? { user: { floor } } : {}),
    },
    select: { amount: true, paidAt: true },
  });

  return {
    todaysOrders: live.length,
    portions: live.reduce((s, o) => s + o.items.reduce((q, i) => q + i.quantity, 0), 0),
    delivered: live.filter((o) => o.status === "DELIVERED").length,
    pending: live.filter((o) => o.status === "PENDING").length,
    totalSales: live.reduce((s, o) => s + o.amount, 0),
    cashPaid: cashRows.filter((o) => o.paidAt && dhakaDate(o.paidAt) === f.date).reduce((s, o) => s + o.amount, 0),
    creditBalance,
    activeUsers: users.length,
    usersWithDue,
    outstandingDue,
    pack: [...pack.values()].sort((a, b) => a.slot.localeCompare(b.slot) || b.portions - a.portions),
  };
}

/** Is every office in scope on day-off for this date? */
export async function dayOffState(officeIds: string[], date: string) {
  if (!officeIds.length) return { closed: false, total: 0, off: 0 };
  const off = await prisma.dayOff.count({ where: { date, officeId: { in: officeIds } } });
  return { closed: off === officeIds.length, total: officeIds.length, off };
}

export type DayOffBanner = {
  closed: boolean;
  partial: boolean;
  offToday: number;
  total: number;
  note: string | null;
  /** Contiguous all-off range that contains today, when today is fully off. */
  from: string | null;
  to: string | null;
};

export async function dayOffBanner(officeIds: string[], today: string): Promise<DayOffBanner> {
  const empty: DayOffBanner = { closed: false, partial: false, offToday: 0, total: officeIds.length, note: null, from: null, to: null };
  if (!officeIds.length) return empty;
  const rows = await prisma.dayOff.findMany({
    where: { officeId: { in: officeIds }, date: { gte: addDays(today, -120), lte: addDays(today, 120) } },
    select: { date: true, note: true },
  });
  const byDate = new Map<string, { n: number; note: string | null }>();
  for (const row of rows) {
    const entry = byDate.get(row.date) ?? { n: 0, note: null };
    entry.n += 1;
    if (row.note) entry.note = row.note;
    byDate.set(row.date, entry);
  }
  const todayRow = byDate.get(today);
  const offToday = todayRow?.n ?? 0;
  const closed = offToday === officeIds.length;
  const full = (date: string) => (byDate.get(date)?.n ?? 0) === officeIds.length;
  let from: string | null = null;
  let to: string | null = null;
  if (closed) {
    from = today;
    to = today;
    while (full(addDays(from, -1))) from = addDays(from, -1);
    while (full(addDays(to, 1))) to = addDays(to, 1);
  }
  return {
    closed,
    partial: offToday > 0 && !closed,
    offToday,
    total: officeIds.length,
    note: todayRow?.note ?? null,
    from,
    to,
  };
}

export async function officeIdsForFilter(scope: OfficeScope, office: string) {
  if (office === "all") {
    const ids = (await listOffices({ scope, activeOnly: true })).map((o) => o.id);
    if (!ids.length) throw new UserError("No active office to update.");
    return ids;
  }
  if (scope && !scope.includes(office)) throw new UserError("You can't change that location.");
  const row = await prisma.office.findUnique({ where: { id: office }, select: { id: true } });
  if (!row) throw new UserError("Office not found.");
  return [row.id];
}

export async function setDayOff(officeIds: string[], date: string, off: boolean, note?: string | null) {
  if (off) {
    await prisma.$transaction(
      officeIds.map((officeId) =>
        prisma.dayOff.upsert({
          where: { officeId_date: { officeId, date } },
          create: { officeId, date, note: note ?? null },
          update: { note: note ?? null },
        }),
      ),
    );
  } else {
    await prisma.dayOff.deleteMany({ where: { date, officeId: { in: officeIds } } });
  }
}

/** Write one DayOff row per date per office. Existing rows in the range keep the new note. */
export async function setDayOffRange(officeIds: string[], start: string, end: string, note: string | null) {
  if (!isDateStr(start) || !isDateStr(end)) throw new UserError("Pick valid dates.");
  if (end < start) throw new UserError("End date is before the start date.");
  const dates: string[] = [];
  let cursor = start;
  for (let i = 0; i < 62 && cursor <= end; i++) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  if (dates[dates.length - 1] !== end) throw new UserError("Pick a range of 62 days or fewer.");
  const trimmed = note?.trim() || null;
  if (trimmed && trimmed.length > 500) throw new UserError("Keep the note under 500 characters.");
  await prisma.$transaction(
    dates.flatMap((date) =>
      officeIds.map((officeId) =>
        prisma.dayOff.upsert({
          where: { officeId_date: { officeId, date } },
          create: { officeId, date, note: trimmed },
          update: { note: trimmed },
        }),
      ),
    ),
  );
}

/** Lift closures from today forward for the offices in the current filter. Past dates stay as history. */
export async function resumeCatering(officeIds: string[], fromDate: string) {
  if (!officeIds.length) return;
  await prisma.dayOff.deleteMany({ where: { officeId: { in: officeIds }, date: { gte: fromDate } } });
}

export type DistributionFilters = { officeId?: string; floor?: string; date: string; q?: string };

export async function distributionOrders(scope: OfficeScope, f: DistributionFilters) {
  const officeIds = scopedOfficeIds(scope, f.officeId);
  const q = f.q?.trim();
  const rows = await prisma.order.findMany({
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
    include: {
      office: { select: { name: true } },
      placedBy: { select: { name: true } },
      items: true,
      user: { select: { id: true, name: true, employeeId: true, floor: true, desk: true, building: true } },
    },
  });
  // Spec §6.12 delivered sorting: Unpaid first (latest delivered first), then Paid
  // (latest payment first). Pending stay oldest-first for the packing queue.
  const pending = rows.filter((o) => o.status === "PENDING").sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const delivered = rows
    .filter((o) => o.status === "DELIVERED")
    .sort((a, b) => {
      const aUnpaid = a.paymentStatus === "UNPAID" ? 0 : 1;
      const bUnpaid = b.paymentStatus === "UNPAID" ? 0 : 1;
      if (aUnpaid !== bUnpaid) return aUnpaid - bUnpaid;
      if (aUnpaid === 0) return (b.deliveredAt?.getTime() ?? 0) - (a.deliveredAt?.getTime() ?? 0);
      return (b.paidAt?.getTime() ?? 0) - (a.paidAt?.getTime() ?? 0);
    });
  const cancelled = rows.filter((o) => o.status === "CANCELLED").sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return [...pending, ...delivered, ...cancelled];
}
