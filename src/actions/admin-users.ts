"use server";

import { revalidatePath } from "next/cache";
import type { Role } from "@prisma/client";
import { run } from "@/lib/action";
import { assertStaff, assertSuperAdmin } from "@/lib/session";
import { clearMemberHistory, deleteMember, setBanned, setRole, setZone, updatePhone } from "@/server/members";
import { recordDeposit, setBalance } from "@/server/wallet";
import { assertMemberAccess } from "@/server/members";

const refresh = () => revalidatePath("/", "layout");

export async function setRoleAction(memberId: string, role: Role) {
  return run(async () => {
    await setRole(await assertSuperAdmin(), memberId, role);
    refresh();
  });
}

export async function assignZoneAction(memberId: string, zoneId: string | null) {
  return run(async () => {
    await setZone(await assertStaff(), memberId, zoneId);
    refresh();
  });
}

export async function depositAction(memberId: string, amount: number, note: string) {
  return run(async () => {
    const actor = await assertStaff();
    await assertMemberAccess(actor, memberId);
    await recordDeposit(actor.id, memberId, amount, note);
    refresh();
  });
}

export async function banAction(memberId: string, banned: boolean) {
  return run(async () => {
    await setBanned(await assertStaff(), memberId, banned);
    refresh();
  });
}

export async function deleteMemberAction(memberId: string) {
  return run(async () => {
    await deleteMember(await assertStaff(), memberId);
    refresh();
  });
}

export async function editPhoneAction(memberId: string, phone: string) {
  return run(async () => {
    await updatePhone(await assertStaff(), memberId, phone);
    refresh();
  });
}

/** Clear Order History (spec §8.3): atomic account reset, balance must be exactly ৳0. */
export async function clearHistoryAction(memberId: string) {
  return run(async () => {
    const actor = await assertStaff();
    await clearMemberHistory(actor, memberId);
    refresh();
  });
}

export async function editBalanceAction(memberId: string, balance: number) {
  return run(async () => {
    const actor = await assertStaff();
    await assertMemberAccess(actor, memberId);
    await setBalance(actor.id, memberId, balance);
    refresh();
  });
}
