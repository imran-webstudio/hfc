import type { LedgerType, OrderStatus, PaymentStatus, Slot } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ActivityItem =
  | {
      kind: "order";
      id: string;
      at: string;
      title: string;
      quantity: number;
      slot: Slot;
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

export type MemberSummary = {
  balance: number;
  totalDue: number;
  dueWallet: number;
  unpaidCash: number;
  paymentMode: "WALLET" | "CASH";
  mealsOrdered: number;
  cancelled: number;
  mealSpend: number;
  depositsReceived: number;
  duePayments: number;
  activity: ActivityItem[];
};

/** Everything the history pages need for one member: wallet stats + merged order/ledger feed. */
export async function getMemberSummary(userId: string): Promise<MemberSummary> {
  const [user, orders, ledger] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { balance: true, accountType: true } }),
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { office: { select: { name: true } }, placedBy: { select: { name: true } } },
    }),
    prisma.ledgerEntry.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { name: true } } },
    }),
  ]);

  const live = orders.filter((o) => o.status !== "CANCELLED");
  const unpaidCash = orders
    .filter((o) => o.status === "DELIVERED" && (o.paymentStatus === "UNPAID" || o.paymentStatus === "DUE"))
    .reduce((s, o) => s + o.amount, 0);
  const dueWallet = Math.max(0, -user.balance);
  const sum = (t: LedgerType) => ledger.filter((l) => l.type === t).reduce((s, l) => s + l.amount, 0);

  const activity: ActivityItem[] = [
    ...orders.map(
      (o): ActivityItem => ({
        kind: "order",
        id: o.id,
        at: o.createdAt.toISOString(),
        title: o.title,
        quantity: o.quantity,
        slot: o.slot,
        office: o.office.name,
        mealDate: o.mealDate,
        amount: o.amount,
        status: o.status,
        paymentStatus: o.paymentStatus,
        note: o.note,
        placedBy: o.placedBy?.name ?? null,
        deliveredAt: o.deliveredAt?.toISOString() ?? null,
      }),
    ),
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
    totalDue: dueWallet + unpaidCash,
    dueWallet,
    unpaidCash,
    paymentMode: user.accountType === "REGULAR" ? "WALLET" : "CASH",
    mealsOrdered: orders.length,
    cancelled: orders.length - live.length,
    mealSpend: live.reduce((s, o) => s + o.amount, 0),
    depositsReceived: sum("DEPOSIT"),
    duePayments: sum("DUE_PAYMENT"),
    activity,
  };
}

/** Compact "Due ৳300" / "Bal ৳500" figure shown in headers. */
export async function getWalletBadge(userId: string) {
  const s = await getMemberSummary(userId);
  return { balance: s.balance, totalDue: s.totalDue };
}
