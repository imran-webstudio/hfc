import type { LedgerType, OrderStatus, PaymentStatus, Slot } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type OrderLine = { title: string; slot: Slot; quantity: number; unitPrice: number; subtotal: number };

export type ActivityItem =
  | {
      kind: "order";
      id: string;
      at: string;
      /** Joined item titles, e.g. "Chicken Curry, Beef Polao" (kept for compact lists). */
      title: string;
      lines: OrderLine[];
      quantity: number;
      office: string;
      mealDate: string;
      amount: number;
      status: OrderStatus;
      paymentStatus: PaymentStatus;
      note: string | null;
      placedBy: string | null;
      deliveredAt: string | null;
    }
  | {
      kind: "ledger";
      id: string;
      at: string;
      type: LedgerType;
      amount: number;
      balanceAfter: number;
      note: string | null;
      createdBy: string | null;
    };

/**
 * Spec §9 summary, in spec order:
 *   Current Balance = Total Deposit − Total Bill
 *   Meals Ordered   = total quantity across valid (non-cancelled) orders
 *   Total Bill      = sum of grand totals of valid orders (each counted once,
 *                     regardless of payment status)
 *   Total Deposit   = account deposits (DEPOSIT + legacy DUE_PAYMENT) + Cash Paid
 *                     order amounts (CASH_PAYMENT ledger) + ADJUSTMENT corrections
 * ORDER_BILL ledger rows are the bill side of the ledger, not deposits, and are
 * excluded from the activity feed (the order itself is the visible record).
 * Extra legacy fields (totalDue etc.) are kept for older UI surfaces.
 */
export type MemberSummary = {
  balance: number;
  mealsOrdered: number;
  totalBill: number;
  totalDeposit: number;
  // legacy / derived helpers
  totalDue: number;
  cancelled: number;
  activity: ActivityItem[];
};

const DEPOSIT_TYPES: LedgerType[] = ["DEPOSIT", "DUE_PAYMENT", "CASH_PAYMENT", "ADJUSTMENT"];

export async function getMemberSummary(userId: string): Promise<MemberSummary> {
  const [user, orders, ledger] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { balance: true } }),
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { office: { select: { name: true } }, placedBy: { select: { name: true } }, items: true },
    }),
    prisma.ledgerEntry.findMany({
      where: { userId, type: { not: "ORDER_BILL" } },
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { name: true } } },
    }),
  ]);

  const live = orders.filter((o) => o.status !== "CANCELLED");
  const totalBill = live.reduce((s, o) => s + o.amount, 0);
  const totalDeposit = ledger.filter((l) => DEPOSIT_TYPES.includes(l.type)).reduce((s, l) => s + l.amount, 0);
  const mealsOrdered = live.reduce((s, o) => s + o.items.reduce((q, i) => q + i.quantity, 0), 0);

  const activity: ActivityItem[] = [
    ...orders.map((o): ActivityItem => {
      const lines: OrderLine[] = o.items.map((i) => ({ title: i.title, slot: i.slot, quantity: i.quantity, unitPrice: i.unitPrice, subtotal: i.subtotal }));
      return {
        kind: "order",
        id: o.id,
        at: o.createdAt.toISOString(),
        title: lines.map((l) => l.title).join(", ") || "Order",
        lines,
        quantity: lines.reduce((q, l) => q + l.quantity, 0),
        office: o.office.name,
        mealDate: o.mealDate,
        amount: o.amount,
        status: o.status,
        paymentStatus: o.paymentStatus,
        note: o.note,
        placedBy: o.placedBy?.name ?? null,
        deliveredAt: o.deliveredAt?.toISOString() ?? null,
      };
    }),
    ...ledger.map(
      (l): ActivityItem => ({
        kind: "ledger",
        id: l.id,
        at: l.createdAt.toISOString(),
        type: l.type,
        amount: l.amount,
        balanceAfter: l.balanceAfter,
        note: l.note,
        createdBy: l.createdBy?.name ?? null,
      }),
    ),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return {
    balance: user.balance,
    mealsOrdered,
    totalBill,
    totalDeposit,
    totalDue: Math.max(0, -user.balance),
    cancelled: orders.length - live.length,
    activity,
  };
}

/** Compact "Due ৳300" / "Bal ৳500" figure shown in headers. */
export async function getWalletBadge(userId: string) {
  const s = await getMemberSummary(userId);
  return { balance: s.balance, totalDue: s.totalDue };
}
