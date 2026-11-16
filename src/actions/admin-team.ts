"use server";

import { revalidatePath } from "next/cache";
import { run } from "@/lib/action";
import { assertStaff, assertSuperAdmin } from "@/lib/session";
import { addManager, createOffice, managerCandidates, removeManager, setLunchCutoff, setOfficeActive } from "@/server/offices";
import { officeScope } from "@/lib/session";
import { UserError } from "@/lib/action";
import { officeIdsForFilter, resumeCatering, setDayOff, setDayOffRange } from "@/server/stats";
import { isDateStr, todayStr } from "@/lib/time";

const refresh = () => revalidatePath("/", "layout");

export async function createOfficeAction(input: { name: string; address: string; cutoff: string }) {
  return run(async () => {
    await assertSuperAdmin();
    await createOffice(input);
    refresh();
  });
}

export async function setOfficeActiveAction(officeId: string, active: boolean) {
  return run(async () => {
    await assertSuperAdmin();
    await setOfficeActive(officeId, active);
    refresh();
  });
}

export async function saveLunchCutoffAction(officeId: string, cutoff: string) {
  return run(async () => {
    await assertSuperAdmin();
    await setLunchCutoff(officeId, cutoff);
    refresh();
  });
}

export async function addManagerAction(officeId: string, userId: string) {
  return run(async () => {
    await assertSuperAdmin();
    await addManager(officeId, userId);
    refresh();
  });
}

export async function removeManagerAction(officeId: string, userId: string) {
  return run(async () => {
    await assertSuperAdmin();
    await removeManager(officeId, userId);
    refresh();
  });
}

export async function managerCandidatesAction(officeId: string, q: string) {
  return run(async () => {
    await assertSuperAdmin();
    return managerCandidates(officeId, q);
  });
}

/** Dashboard "Take day off" / resume: applies to every office in the viewer's current filter. */
export async function setDayOffAction(office: string, date: string, off: boolean) {
  return run(async () => {
    const viewer = await assertStaff();
    if (!isDateStr(date)) throw new UserError("Invalid date.");
    await setDayOff(await officeIdsForFilter(officeScope(viewer), office), date, off);
    refresh();
  });
}

/** Inclusive start/end. One DayOff row per date per office, with the same note. */
export async function setDayOffRangeAction(office: string, start: string, end: string, note: string) {
  return run(async () => {
    const viewer = await assertStaff();
    await setDayOffRange(await officeIdsForFilter(officeScope(viewer), office), start, end, note);
    refresh();
  });
}

/** Clear day-offs from today forward for the offices in the current filter. */
export async function resumeCateringAction(office: string) {
  return run(async () => {
    const viewer = await assertStaff();
    await resumeCatering(await officeIdsForFilter(officeScope(viewer), office), todayStr());
    refresh();
  });
}
