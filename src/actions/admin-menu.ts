"use server";

import { revalidatePath } from "next/cache";
import type { Slot } from "@prisma/client";
import { run, UserError } from "@/lib/action";
import { assertStaff, officeScope, type Viewer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { listOffices, setCutoffs, setOfferDinner } from "@/server/offices";
import {
  addDatedOption,
  addWeeklyOption,
  fanOutOfficeIds,
  keepSavedMeal,
  removeOption,
  setSavedMealArchived,
  setStockOut,
  updateOption,
  type OptionInput,
} from "@/server/menu";
import { isDateStr } from "@/lib/time";

const refresh = () => revalidatePath("/", "layout");

/** Resolve the office selector ("all" or an office id) to the active offices the viewer may touch. */
async function targetOffices(viewer: Viewer, office: string): Promise<string[]> {
  const scope = officeScope(viewer);
  if (office === "all") return (await listOffices({ scope, activeOnly: true })).map((o) => o.id);
  if (scope && !scope.includes(office)) throw new UserError("You can't change that location.");
  return [office];
}

export async function saveCutoffsAction(office: string, lunch: string, dinner: string) {
  return run(async () => {
    const viewer = await assertStaff();
    await setCutoffs(await targetOffices(viewer, office), lunch, dinner);
    refresh();
  });
}

export async function setOfferDinnerAction(office: string, offer: boolean) {
  return run(async () => {
    const viewer = await assertStaff();
    await setOfferDinner(await targetOffices(viewer, office), offer);
    refresh();
  });
}

export type OptionPayload = {
  slot: Slot;
  title: string;
  description: string;
  price: number;
  imageUrl: string | null;
  maxQuantity: number | null;
};

/** Menus are identical at every active office the viewer manages. `office` is ignored. */
export async function addWeeklyOptionAction(_office: string, weekday: number, payload: OptionPayload, keep = false) {
  return run(async () => {
    const viewer = await assertStaff();
    const input: OptionInput = payload;
    await addWeeklyOption(await fanOutOfficeIds(officeScope(viewer)), weekday, input);
    if (keep) await keepSavedMeal(input);
    refresh();
  });
}

export async function addDatedOptionAction(_office: string, date: string, payload: OptionPayload, keep = false) {
  return run(async () => {
    const viewer = await assertStaff();
    if (!isDateStr(date)) throw new UserError("Pick a valid date.");
    await addDatedOption(await fanOutOfficeIds(officeScope(viewer)), date, payload);
    if (keep) await keepSavedMeal(payload);
    refresh();
  });
}

export async function updateOptionAction(optionId: string, payload: OptionPayload) {
  return run(async () => {
    const viewer = await assertStaff();
    await updateOption(optionId, payload, officeScope(viewer));
    refresh();
  });
}

export async function removeOptionAction(optionId: string) {
  return run(async () => {
    const viewer = await assertStaff();
    await removeOption(optionId, officeScope(viewer));
    refresh();
  });
}

export async function stockOutAction(optionId: string, date: string, stockedOut: boolean, office: string) {
  return run(async () => {
    const viewer = await assertStaff();
    const scope = officeScope(viewer);
    const opt = await prisma.menuOption.findUnique({ where: { id: optionId } });
    if (!opt || (scope && !scope.includes(opt.officeId))) throw new UserError("Option not found.");
    // In "all locations" mode a stock-out applies to the same option at every office it was published to.
    const targets =
      office === "all"
        ? await prisma.menuOption.findMany({
            where: { groupId: opt.groupId, ...(scope ? { officeId: { in: scope } } : {}) },
            select: { id: true },
          })
        : [{ id: optionId }];
    for (const t of targets) await setStockOut(t.id, date, stockedOut);
    refresh();
  });
}

export async function archiveSavedMealAction(id: string, archived: boolean) {
  return run(async () => {
    await assertStaff();
    await setSavedMealArchived(id, archived);
    refresh();
  });
}
