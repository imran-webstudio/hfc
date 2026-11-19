import type { Prisma } from "@prisma/client";

/**
 * Staff-side audit trail for financial actions (spec §8.2). Written inside the same
 * transaction as the action it records. Audit rows are never shown in the member's
 * account history and survive Clear Order History.
 */
export async function writeAudit(
  tx: Prisma.TransactionClient,
  input: { actorId: string | null; memberId: string; action: string; detail?: string | null; amount?: number | null },
) {
  await tx.auditLog.create({
    data: {
      actorId: input.actorId,
      memberId: input.memberId,
      action: input.action,
      detail: input.detail?.trim() || null,
      amount: input.amount ?? null,
    },
  });
}
