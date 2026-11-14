"use server";

import { revalidatePath } from "next/cache";
import type { AccountType } from "@prisma/client";
import { run } from "@/lib/action";
import { assertStaff } from "@/lib/session";
import { deleteMember, setAccountType, setBanned, setZone, updatePhone } from "@/server/members";
import { recordDeposit, setBalance } from "@/server/wallet";
import { assertMemberAccess } from "@/server/members";

const refresh = () => revalidatePath("/", "layout");

export async function setAccountTypeAction(memberId: string, type: AccountType) {
  return run(async () => {
    await setAccountType(await assertStaff(), memberId, type);
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

export async function editBalanceAction(memberId: string, balance: number) {
  return run(async () => {
    const actor = await assertStaff();
    await assertMemberAccess(actor, memberId);
    await setBalance(actor.id, memberId, balance);
    refresh();
  });
}
