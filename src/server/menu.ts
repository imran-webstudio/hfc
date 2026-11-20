import { randomUUID } from "node:crypto";
import type { MenuOption, Prisma, Slot } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { UserError } from "@/lib/action";
import { isDateStr, weekdayOf } from "@/lib/time";
import { listOffices, type OfficeScope } from "@/server/offices";

export type OptionInput = {
  slot: Slot;
  title: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  /** Null or omitted = unlimited daily cap. */
  maxQuantity?: number | null;
};

function cleanMax(v: number | null | undefined): number | null {
  if (v == null) return null;
  if (!Number.isInteger(v) || v < 1 || v > 10000) {
    throw new UserError("Maximum quantity must be a whole number of at least 1, or empty for unlimited.");
  }
  return v;
}

function cleanInput(i: OptionInput) {
  const title = i.title.trim();
  if (!title) throw new UserError("Title is required.");
  if (!Number.isInteger(i.price) || i.price < 0 || i.price > 100000) throw new UserError("Enter a whole taka price.");
  return {
    slot: i.slot,
    title,
    description: i.description?.trim() || null,
    price: i.price,
    imageUrl: i.imageUrl || null,
    maxQuantity: cleanMax(i.maxQuantity),
  };
}

/** Active offices a viewer may write. Super admins (scope null) get every active office. */
export async function fanOutOfficeIds(scope: OfficeScope): Promise<string[]> {
  return (await listOffices({ scope, activeOnly: true })).map((o) => o.id);
}

/** Weekly templates for an office, grouped by weekday/slot. */
export async function weeklyOptions(officeId: string) {
  return prisma.menuOption.findMany({
    where: { officeId, active: true, weekday: { not: null }, date: null },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Two layers decide if a dish can still be ordered on a meal date:
 *
 * 1. MenuOption.maxQuantity — the planned daily cap for the dish. Null means unlimited.
 *    Spec §5: stock is ONE GLOBAL POOL per dish (groupId), shared by all buildings.
 *    Remaining = maxQuantity − the sum of item quantities on non-cancelled orders for
 *    ANY office copy of this groupId on that meal date. Cancelling frees the pool.
 * 2. StockOut — a manual same-day override ("don't serve this today"). It blocks ordering
 *    even when the cap still has room, or when the cap is unlimited. A StockOut row on any
 *    office copy of the group applies to the group. Reaching 0 does not write a StockOut
 *    row, so a cancellation can reopen a capped dish and clearing a StockOut does not
 *    change the cap.
 *
 * `ordered` / `remaining` are ADMIN-ONLY numbers. Member-facing code must never receive
 * them — members get only the derived `available` boolean (spec §5/§14.3/§20).
 */
export type LiveOption = MenuOption & {
  stockedOut: boolean;
  ordered: number;
  /** Null = unlimited and not manually stocked out. 0 = blocked. Admin-only. */
  remaining: number | null;
  /** The only stock signal member-facing code may use. */
  available: boolean;
};

type Db = Prisma.TransactionClient | typeof prisma;

/** All MenuOption ids (every office copy) sharing a groupId. */
export async function groupOptionIds(db: Db, groupId: string): Promise<string[]> {
  const rows = await db.menuOption.findMany({ where: { groupId }, select: { id: true } });
  return rows.map((r) => r.id);
}

/** Ordered quantity for a dish group on a date, summed across ALL offices (global pool). */
export async function orderedQtyForGroup(db: Db, groupId: string, date: string, excludeOrderId?: string): Promise<number> {
  const ids = await groupOptionIds(db, groupId);
  if (!ids.length) return 0;
  const items = await db.orderItem.findMany({
    where: {
      optionId: { in: ids },
      order: { mealDate: date, status: { not: "CANCELLED" }, ...(excludeOrderId ? { id: { not: excludeOrderId } } : {}) },
    },
    select: { quantity: true },
  });
  return items.reduce((s, i) => s + i.quantity, 0);
}

/** Per-option ordered quantities, resolved through the global (group) pool. */
export async function orderedQtyByOption(optionIds: string[], date: string) {
  const map = new Map<string, number>();
  if (!optionIds.length) return map;
  const options = await prisma.menuOption.findMany({ where: { id: { in: optionIds } }, select: { id: true, groupId: true } });
  const byGroup = new Map<string, number>();
  for (const groupId of new Set(options.map((o) => o.groupId))) {
    byGroup.set(groupId, await orderedQtyForGroup(prisma, groupId, date));
  }
  for (const o of options) map.set(o.id, byGroup.get(o.groupId) ?? 0);
  return map;
}

export function remainingFor(maxQuantity: number | null, ordered: number, stockedOut: boolean): number | null {
  if (stockedOut) return 0;
  if (maxQuantity == null) return null;
  return Math.max(0, maxQuantity - ordered);
}

/** Everything orderable at an office on a given date (weekly templates + dated meals). */
export async function optionsForDate(officeId: string, date: string, opts: { includeStockedOut?: boolean } = {}) {
  const rows = await prisma.menuOption.findMany({
    where: {
      officeId,
      active: true,
      OR: [{ date }, { date: null, weekday: weekdayOf(date) }],
    },
    orderBy: [{ slot: "asc" }, { createdAt: "asc" }],
    include: { stockOuts: { where: { date } } },
  });
  const used = await orderedQtyByOption(
    rows.map((r) => r.id),
    date,
  );
  // A manual StockOut on ANY office copy of the group stocks the dish out globally.
  const groupIds = [...new Set(rows.map((r) => r.groupId))];
  const groupStockOuts = groupIds.length
    ? await prisma.stockOut.findMany({
        where: { date, option: { groupId: { in: groupIds } } },
        select: { option: { select: { groupId: true } } },
      })
    : [];
  const outGroups = new Set(groupStockOuts.map((s) => s.option.groupId));
  const mapped: LiveOption[] = rows.map(({ stockOuts, ...o }) => {
    const stockedOut = stockOuts.length > 0 || outGroups.has(o.groupId);
    const ordered = used.get(o.id) ?? 0;
    const remaining = remainingFor(o.maxQuantity, ordered, stockedOut);
    return { ...o, stockedOut, ordered, remaining, available: remaining !== 0 };
  });
  return opts.includeStockedOut ? mapped : mapped.filter((o) => !o.stockedOut);
}

/** One active row per group, preferring `preferOfficeId`, so the shared menu renders once. */
export async function sharedWeeklyMenu(officeIds: string[], preferOfficeId?: string) {
  if (!officeIds.length) return [];
  const rows = await prisma.menuOption.findMany({
    where: { officeId: { in: officeIds }, active: true, weekday: { not: null }, date: null },
    orderBy: { createdAt: "asc" },
  });
  const seen = new Map<string, MenuOption>();
  for (const row of rows) {
    const current = seen.get(row.groupId);
    if (!current || (preferOfficeId && row.officeId === preferOfficeId && current.officeId !== preferOfficeId)) {
      seen.set(row.groupId, row);
    }
  }
  return [...seen.values()];
}

/** Create a weekly template at every given office (shared groupId). */
export async function addWeeklyOption(officeIds: string[], weekday: number, input: OptionInput) {
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) throw new UserError("Invalid weekday.");
  if (!officeIds.length) throw new UserError("No active office to add this option to.");
  const data = cleanInput(input);
  const groupId = randomUUID();
  await prisma.menuOption.createMany({ data: officeIds.map((officeId) => ({ ...data, officeId, weekday, groupId })) });
}

export async function addDatedOption(officeIds: string[], date: string, input: OptionInput) {
  if (!isDateStr(date)) throw new UserError("Pick a valid date.");
  if (!officeIds.length) throw new UserError("No active office to add this option to.");
  const data = cleanInput(input);
  const groupId = randomUUID();
  await prisma.menuOption.createMany({ data: officeIds.map((officeId) => ({ ...data, officeId, date, groupId })) });
}

async function loadScopedOption(optionId: string, scope: OfficeScope) {
  const opt = await prisma.menuOption.findUnique({ where: { id: optionId } });
  if (!opt || !opt.active) throw new UserError("Option not found.");
  if (scope && !scope.includes(opt.officeId)) throw new UserError("You can't change that location.");
  return opt;
}

/**
 * Edit fans out to every active office the viewer manages. Offices that don't
 * yet have an active row in the group get one, so a newly added office stays in sync.
 * Inactive (soft-deleted) rows are left alone so past orders keep their dish.
 */
export async function updateOption(optionId: string, input: OptionInput, scope: OfficeScope) {
  const opt = await loadScopedOption(optionId, scope);
  const data = cleanInput(input);
  const officeIds = await fanOutOfficeIds(scope);
  await prisma.$transaction(async (tx) => {
    await tx.menuOption.updateMany({
      where: { groupId: opt.groupId, active: true, officeId: { in: officeIds } },
      data,
    });
    const existing = await tx.menuOption.findMany({
      where: { groupId: opt.groupId, active: true, officeId: { in: officeIds } },
      select: { officeId: true },
    });
    const have = new Set(existing.map((e) => e.officeId));
    const missing = officeIds.filter((id) => !have.has(id));
    if (missing.length) {
      await tx.menuOption.createMany({
        data: missing.map((officeId) => ({
          ...data,
          officeId,
          groupId: opt.groupId,
          weekday: opt.weekday,
          date: opt.date,
        })),
      });
    }
  });
}

/** Soft-delete: hide the dish everywhere in scope. Past orders keep optionId and the title snapshot. */
export async function removeOption(optionId: string, scope: OfficeScope) {
  const opt = await loadScopedOption(optionId, scope);
  const officeIds = await fanOutOfficeIds(scope);
  await prisma.menuOption.updateMany({
    where: { groupId: opt.groupId, officeId: { in: officeIds } },
    data: { active: false },
  });
}

/**
 * Serialise stock checks for one dish+date inside the caller's transaction.
 * pg_advisory_xact_lock is held until the transaction commits/rolls back, so two
 * simultaneous orders for the same dish cannot both pass the cap check and oversell
 * (spec §5/§19). Different dishes/dates lock different keys and proceed in parallel.
 * Callers must acquire locks in a deterministic (sorted) order to avoid deadlocks
 * between multi-item orders — see orders.ts, which sorts items by groupId first.
 */
export async function lockGroupStock(tx: Prisma.TransactionClient, groupId: string, date: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${groupId}:${date}`} )::bigint)`;
}

/**
 * Validate one dish against the GLOBAL stock pool. Assumes lockGroupStock was already
 * taken for this group+date in the same transaction. `excludeOrderId` lets Edit Order
 * validate a replacement set without counting the order's own current items.
 */
export async function assertPortionCap(
  tx: Prisma.TransactionClient,
  option: { id: string; groupId: string; maxQuantity: number | null },
  date: string,
  quantity: number,
  excludeOrderId?: string,
) {
  const out = await tx.stockOut.findFirst({ where: { date, option: { groupId: option.groupId } } });
  if (out) throw new UserError("Sorry, that meal is out of stock.");
  if (option.maxQuantity == null) return;
  const used = await orderedQtyForGroup(tx, option.groupId, date, excludeOrderId);
  const left = option.maxQuantity - used;
  if (quantity > left) {
    throw new UserError(left <= 0 ? "This dish is sold out for that day." : `Only ${left} left for that day.`);
  }
}

export async function setStockOut(optionId: string, date: string, stockedOut: boolean) {
  if (stockedOut) {
    await prisma.stockOut.upsert({
      where: { optionId_date: { optionId, date } },
      create: { optionId, date },
      update: {},
    });
  } else {
    await prisma.stockOut.deleteMany({ where: { optionId, date } });
  }
}

// ---- saved meals ---------------------------------------------------------
export async function savedMeals(archived: boolean) {
  return prisma.savedMeal.findMany({ where: { archived }, orderBy: { createdAt: "desc" } });
}

export async function keepSavedMeal(input: OptionInput) {
  const data = cleanInput(input);
  const existing = await prisma.savedMeal.findFirst({
    where: { title: data.title, price: data.price, archived: false },
  });
  if (existing) return existing;
  return prisma.savedMeal.create({
    data: { title: data.title, description: data.description, price: data.price, imageUrl: data.imageUrl },
  });
}

export async function setSavedMealArchived(id: string, archived: boolean) {
  await prisma.savedMeal.update({ where: { id }, data: { archived } });
}
