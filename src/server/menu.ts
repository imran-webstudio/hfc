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
 * 1. MenuOption.maxQuantity — the planned daily cap for this office's copy of the dish.
 *    Null means unlimited. Remaining = maxQuantity − the sum of quantities on non-cancelled
 *    orders for this optionId and meal date. Cancelling an order frees the cap.
 *    The number is copied to every office by fan-out, but each office counts only its own
 *    orders, because each kitchen packs its own portions.
 * 2. StockOut — a manual same-day override ("don't serve this today"). It blocks ordering
 *    even when the cap still has room, or when the cap is unlimited. Reaching 0 does not
 *    write a StockOut row, so a cancellation can reopen a capped dish and clearing a
 *    StockOut does not change the cap.
 */
export type LiveOption = MenuOption & {
  stockedOut: boolean;
  ordered: number;
  /** Null = unlimited and not manually stocked out. 0 = blocked. */
  remaining: number | null;
};

export async function orderedQtyByOption(optionIds: string[], date: string) {
  const map = new Map<string, number>();
  if (!optionIds.length) return map;
  const rows = await prisma.order.groupBy({
    by: ["optionId"],
    where: { optionId: { in: optionIds }, mealDate: date, status: { not: "CANCELLED" } },
    _sum: { quantity: true },
  });
  for (const row of rows) {
    if (row.optionId) map.set(row.optionId, row._sum.quantity ?? 0);
  }
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
  const mapped: LiveOption[] = rows.map(({ stockOuts, ...o }) => {
    const stockedOut = stockOuts.length > 0;
    const ordered = used.get(o.id) ?? 0;
    return { ...o, stockedOut, ordered, remaining: remainingFor(o.maxQuantity, ordered, stockedOut) };
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

export async function assertPortionCap(
  tx: Prisma.TransactionClient,
  option: { id: string; maxQuantity: number | null },
  date: string,
  quantity: number,
) {
  const out = await tx.stockOut.findUnique({ where: { optionId_date: { optionId: option.id, date } } });
  if (out) throw new UserError("Sorry, that meal is out of stock.");
  if (option.maxQuantity == null) return;
  const used = await tx.order.aggregate({
    where: { optionId: option.id, mealDate: date, status: { not: "CANCELLED" } },
    _sum: { quantity: true },
  });
  const left = option.maxQuantity - (used._sum.quantity ?? 0);
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
