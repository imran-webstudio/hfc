import type { LedgerType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { UserError } from "@/lib/action";

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

export async function recordDeposit(actorId: string, userId: string, amount: number, note?: string) {
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) throw new UserError("Enter a valid amount.");
  const member = await prisma.user.findUnique({ where: { id: userId } });
  if (!member) throw new UserError("Member not found.");
  if (member.accountType !== "REGULAR") throw new UserError("Only regular members have a wallet. Switch them to Regular first.");
  return prisma.$transaction((tx) =>
    applyLedger(tx, {
      userId,
      // Paying off a negative balance is recorded as a "Due payment"
      type: member.balance < 0 ? "DUE_PAYMENT" : "DEPOSIT",
      amount: Math.round(amount),
      note,
      createdById: actorId,
    }),
  );
}

export async function setBalance(actorId: string, userId: string, newBalance: number) {
  if (!Number.isFinite(newBalance) || Math.abs(newBalance) > 10_000_000) throw new UserError("Enter a valid balance.");
  return prisma.$transaction(async (tx) => {
    const member = await tx.user.findUnique({ where: { id: userId }, select: { balance: true } });
    if (!member) throw new UserError("Member not found.");
    const delta = Math.round(newBalance) - member.balance;
    if (delta === 0) return member.balance;
    return applyLedger(tx, { userId, type: "ADJUSTMENT", amount: delta, note: "Balance set by admin", createdById: actorId });
  });
}
