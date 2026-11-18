import type { LedgerType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { UserError } from "@/lib/action";
import { writeAudit } from "@/server/audit";

type Tx = Prisma.TransactionClient;

/** Move a member's balance and write a ledger row, atomically. Returns the new balance. */
export async function applyLedger(
  tx: Tx,
  input: { userId: string; type: LedgerType; amount: number; note?: string | null; createdById?: string | null },
) {
  const user = await tx.user.update({
    where: { id: input.userId },
    data: { balance: { increment: input.amount } },
    select: { balance: true },
  });
  await tx.ledgerEntry.create({
    data: {
      userId: input.userId,
      type: input.type,
      amount: input.amount,
      balanceAfter: user.balance,
      note: input.note?.trim() || null,
      createdById: input.createdById ?? null,
    },
  });
  return user.balance;
}

/**
 * Account deposit (spec §17.1): every member has a wallet — there is no Regular/One-time
 * split in deposit/payment logic. A deposit always counts toward Total Deposit.
 */
export async function recordDeposit(actorId: string, userId: string, amount: number, note?: string) {
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) throw new UserError("Enter a valid amount.");
  const member = await prisma.user.findUnique({ where: { id: userId } });
  if (!member) throw new UserError("Member not found.");
  return prisma.$transaction(async (tx) => {
    const bal = await applyLedger(tx, {
      userId,
      type: "DEPOSIT",
      amount: Math.round(amount),
      note,
      createdById: actorId,
    });
    await writeAudit(tx, { actorId, memberId: userId, action: "DEPOSIT", detail: note, amount: Math.round(amount) });
    return bal;
  });
}

export async function setBalance(actorId: string, userId: string, newBalance: number) {
  if (!Number.isFinite(newBalance) || Math.abs(newBalance) > 10_000_000) throw new UserError("Enter a valid balance.");
  return prisma.$transaction(async (tx) => {
    const member = await tx.user.findUnique({ where: { id: userId }, select: { balance: true } });
    if (!member) throw new UserError("Member not found.");
    const delta = Math.round(newBalance) - member.balance;
    if (delta === 0) return member.balance;
    const bal = await applyLedger(tx, { userId, type: "ADJUSTMENT", amount: delta, note: "Balance set by admin", createdById: actorId });
    await writeAudit(tx, { actorId, memberId: userId, action: "EDIT_BALANCE", detail: `Balance set to ${Math.round(newBalance)}`, amount: delta });
    return bal;
  });
}
