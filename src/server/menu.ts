import { randomUUID } from "node:crypto";
import type { MenuOption, Slot } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { UserError } from "@/lib/action";
import { isDateStr, weekdayOf } from "@/lib/time";

export type OptionInput = {
  slot: Slot;
  title: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
};

function cleanInput(i: OptionInput) {
  const title = i.title.trim();
  if (!title) throw new UserError("Title is required.");
  if (!Number.isFinite(i.price) || i.price < 0 || i.price > 100000) throw new UserError("Enter a valid price.");
  return {
    slot: i.slot,
    title,
    description: i.description?.trim() || null,
    price: Math.round(i.price),
    imageUrl: i.imageUrl || null,
  };
}

/** Weekly templates for an office, grouped by weekday/slot. */
export async function weeklyOptions(officeId: string) {
  return prisma.menuOption.findMany({
    where: { officeId, active: true, weekday: { not: null }, date: null },
    orderBy: { createdAt: "asc" },
  });
}

export type LiveOption = MenuOption & { stockedOut: boolean };

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
  const mapped: LiveOption[] = rows.map(({ stockOuts, ...o }) => ({ ...o, stockedOut: stockOuts.length > 0 }));
  return opts.includeStockedOut ? mapped : mapped.filter((o) => !o.stockedOut);
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

/** Edit an option. When allOffices is true the change fans out to every office sharing its groupId. */
export async function updateOption(optionId: string, input: OptionInput, allOffices: boolean, scope: string[] | null) {
  const opt = await prisma.menuOption.findUnique({ where: { id: optionId } });
  if (!opt) throw new UserError("Option not found.");
  const data = cleanInput(input);
  await prisma.menuOption.updateMany({
    where: {
      ...(allOffices ? { groupId: opt.groupId } : { id: optionId }),
      ...(scope ? { officeId: { in: scope } } : {}),
    },
    data,
  });
}

export async function removeOption(optionId: string, allOffices: boolean, scope: string[] | null) {
  const opt = await prisma.menuOption.findUnique({ where: { id: optionId } });
  if (!opt) throw new UserError("Option not found.");
  await prisma.menuOption.deleteMany({
    where: {
      ...(allOffices ? { groupId: opt.groupId } : { id: optionId }),
      ...(scope ? { officeId: { in: scope } } : {}),
    },
  });
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
