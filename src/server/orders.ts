import type { MenuOption, Office, Prisma, Slot } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { UserError } from "@/lib/action";
import { config } from "@/lib/config";
import { addDays, cutoffPassed, isDateStr, todayStr } from "@/lib/time";
import { canManageOffice, type Viewer } from "@/lib/session";
import { assertPortionCap, lockGroupStock } from "@/server/menu";
import { applyLedger } from "@/server/wallet";
import { writeAudit } from "@/server/audit";

export const slotCutoff = (office: Pick<Office, "lunchCutoff" | "dinnerCutoff">, slot: Slot) =>
  slot === "LUNCH" ? office.lunchCutoff : office.dinnerCutoff;

export async function isDayOff(officeId: string, date: string) {
  return !!(await prisma.dayOff.findUnique({ where: { officeId_date: { officeId, date } } }));
}

export type SlotState = { open: boolean; reason?: string };

/** Can members still order this slot at this office on this date? */
export function slotState(
  office: Pick<Office, "lunchCutoff" | "dinnerCutoff" | "offerDinner" | "active">,
  date: string,
  slot: Slot,
  dayOff: boolean,
  now = new Date(),
): SlotState {
  if (!office.active) return { open: false, reason: "This location is not active." };
  if (dayOff) return { open: false, reason: "Catering is off on this day." };
  if (slot === "DINNER" && !office.offerDinner) return { open: false, reason: "Dinner is not offered." };
  if (cutoffPassed(date, slotCutoff(office, slot), now)) return { open: false, reason: `${slot === "LUNCH" ? "Lunch" : "Dinner"} orders are closed.` };
  return { open: true };
}

function validateDate(date: string, { allowPast }: { allowPast: boolean }) {
  if (!isDateStr(date)) throw new UserError("Pick a valid date.");
  const today = todayStr();
  if (!allowPast && date < today) throw new UserError("That day has passed.");
  if (date > addDays(today, config.maxAdvanceDays)) throw new UserError("That day is too far ahead.");
}

function validateQty(q: number) {
  if (!Number.isInteger(q) || q < 1 || q > 20) throw new UserError("Quantity must be between 1 and 20.");
}

async function loadOption(optionId: string, date: string) {
  const option = await prisma.menuOption.findUnique({ where: { id: optionId }, include: { office: true } });
  if (!option || !option.active) throw new UserError("That meal is no longer available.");
  const matchesDate = option.date ? option.date === date : option.weekday !== null && new Date(`${date}T00:00:00Z`).getUTCDay() === option.weekday;
  if (!matchesDate) throw new UserError("That meal isn't on the menu for the selected day.");
  return option;
}

export type OrderItemInput = { optionId: string; quantity: number };
type LoadedItem = { option: MenuOption & { office: Office }; quantity: number; subtotal: number };

/**
 * ACCOUNTING INVARIANT (spec §9/§17) — read before touching this file.
 *
 *   Stored balance === Total Deposit − Total Bill, at every instant.
 *   Total Bill    = sum of `amount` over the member's valid (non-cancelled) orders.
 *   Total Deposit = account deposits (DEPOSIT/DUE_PAYMENT ledger) + CASH_PAYMENT ledger
 *                   (+ ADJUSTMENT corrections from Edit Balance).
 *
 * To make that hold continuously, an order is billed AT CREATION: the order transaction
 * writes an ORDER_BILL ledger entry of −amount (ORDER_BILL never counts as a deposit).
 * Payment is then purely a settlement of that already-counted bill:
 *   - Wallet Charge: status only (+paidAt). No ledger movement, no deposit (§17.1).
 *   - Cash Paid: a CASH_PAYMENT ledger entry of +amount raises Total Deposit, offsetting
 *     the already-counted bill — net balance effect of the payment itself is +amount,
 *     matching §17.4 row 2 (deposit 500→700, bill 300→500, balance stays +200).
 * Cancelling / deleting / editing a valid order writes the reverse ORDER_BILL delta in
 * the same transaction, so the invariant survives those too. Delivery changes neither
 * balance nor payment status (spec §6.8).
 */

/** Load + validate a multi-item set, merging duplicate dishes. All-or-nothing. */
async function loadItems(inputs: OrderItemInput[], date: string): Promise<LoadedItem[]> {
  if (!inputs.length) throw new UserError("Add at least one meal to the order.");
  if (inputs.length > 20) throw new UserError("Too many meals in one order.");
  const merged = new Map<string, number>();
  for (const i of inputs) {
    validateQty(i.quantity);
    merged.set(i.optionId, (merged.get(i.optionId) ?? 0) + i.quantity);
  }
  const items: LoadedItem[] = [];
  for (const [optionId, quantity] of merged) {
    validateQty(quantity);
    const option = await loadOption(optionId, date);
    items.push({ option, quantity, subtotal: option.price * quantity });
  }
  // Deterministic lock order for multi-item orders (deadlock avoidance, see menu.ts).
  items.sort((a, b) => a.option.groupId.localeCompare(b.option.groupId));
  return items;
}

/** Inside tx: lock every dish group, validate global stock for all items, then create. */
async function createOrderWithItems(
  tx: Prisma.TransactionClient,
  args: {
    userId: string;
    officeId: string;
    date: string;
    items: LoadedItem[];
    note?: string | null;
    placedById?: string | null;
    billNote: string;
  },
) {
  for (const it of args.items) await lockGroupStock(tx, it.option.groupId, args.date);
  for (const it of args.items) await assertPortionCap(tx, it.option, args.date, it.quantity);
  const amount = args.items.reduce((s, i) => s + i.subtotal, 0);
  const order = await tx.order.create({
    data: {
      userId: args.userId,
      officeId: args.officeId,
      mealDate: args.date,
      amount,
      note: args.note ?? null,
      placedById: args.placedById ?? null,
      items: {
        create: args.items.map((i) => ({
          optionId: i.option.id,
          slot: i.option.slot,
          title: i.option.title,
          unitPrice: i.option.price,
          quantity: i.quantity,
          subtotal: i.subtotal,
        })),
      },
    },
    include: { items: true },
  });
  // Bill at creation — see the accounting invariant above.
  await applyLedger(tx, { userId: args.userId, type: "ORDER_BILL", amount: -amount, note: args.billNote, createdById: args.placedById });
  return order;
}

/**
 * Member places ONE multi-item order (spec §14.1): every dish in this submission —
 * lunch and/or dinner — lands under a single Order ID with one grand total.
 * Cutoffs/day-offs are checked per slot; any failure rejects the whole order.
 * There is deliberately no wallet-due limit (spec §6.10 allows negative balances)
 * and no one-order-per-slot restriction.
 */
export async function placeMemberOrder(viewer: Viewer, input: { items: OrderItemInput[]; date: string }) {
  validateDate(input.date, { allowPast: false });
  if (!viewer.zoneId) throw new UserError("Choose your office in Profile first.");
  const items = await loadItems(input.items, input.date);
  for (const it of items) {
    if (it.option.officeId !== viewer.zoneId) throw new UserError("That meal isn't offered at your location.");
    const state = slotState(it.option.office, input.date, it.option.slot, await isDayOff(it.option.officeId, input.date));
    if (!state.open) throw new UserError(state.reason ?? "Ordering is closed.");
  }
  return prisma.$transaction(
    (tx) =>
      createOrderWithItems(tx, {
        userId: viewer.id,
        officeId: viewer.zoneId!,
        date: input.date,
        items,
        billNote: `Order · ${input.date}`,
      }),
    { isolationLevel: "Serializable" },
  );
}

/** Staff places a multi-item order on behalf of a member (e.g. phone order). Cutoffs are skipped. */
export async function placeAdminOrder(
  actor: Viewer,
  input: { userId: string; items: OrderItemInput[]; date: string; note?: string },
) {
  validateDate(input.date, { allowPast: false });
  const member = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!member) throw new UserError("Choose a member.");
  if (member.banned) throw new UserError("That member is banned.");
  const items = await loadItems(input.items, input.date);
  const officeId = items[0].option.officeId;
  if (items.some((i) => i.option.officeId !== officeId)) throw new UserError("All meals in one order must be from the same office.");
  if (!canManageOffice(actor, officeId)) throw new UserError("You can't place orders for that location.");
  return prisma.$transaction(
    (tx) =>
      createOrderWithItems(tx, {
        userId: member.id,
        officeId,
        date: input.date,
        items,
        note: input.note?.trim() || "Phone Order",
        placedById: actor.id,
        billNote: `Order · ${input.date}`,
      }),
    { isolationLevel: "Serializable" },
  );
}

async function loadOrderFor(actor: Viewer, orderId: string, mode: "staff" | "owner-or-staff") {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { office: true, user: true, items: true } });
  if (!order) throw new UserError("Order not found.");
  const isOwner = order.userId === actor.id;
  const isStaffHere = actor.isStaff && canManageOffice(actor, order.officeId);
  if (mode === "staff" ? !isStaffHere : !(isOwner || isStaffHere)) throw new UserError("You can't change that order.");
  return { order, isStaffHere };
}

/** Reverse an order's bill (cancel/delete). Cash-paid orders also reverse their deposit. */
async function reverseBill(
  tx: Prisma.TransactionClient,
  actor: Viewer,
  order: { id: string; userId: string; amount: number; paymentStatus: string; status: string },
  note: string,
) {
  if (order.status === "CANCELLED") return; // bill was already reversed when it was cancelled
  await applyLedger(tx, { userId: order.userId, type: "ORDER_BILL", amount: order.amount, note, createdById: actor.id });
  if (order.paymentStatus === "CASH_PAID") {
    await applyLedger(tx, { userId: order.userId, type: "CASH_PAYMENT", amount: -order.amount, note: `Reversal · ${note}`, createdById: actor.id });
  }
}

export async function cancelOrder(actor: Viewer, orderId: string) {
  const { order, isStaffHere } = await loadOrderFor(actor, orderId, "owner-or-staff");
  if (order.status !== "PENDING") throw new UserError("Only pending orders can be cancelled.");
  if (!isStaffHere) {
    // Member cancel is blocked once ANY item's slot cutoff has passed for that day.
    for (const slot of new Set(order.items.map((i) => i.slot))) {
      if (cutoffPassed(order.mealDate, slotCutoff(order.office, slot))) {
        throw new UserError("The cutoff has passed — ask your office admin to cancel.");
      }
    }
  }
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: { id: orderId, status: "PENDING" },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    if (claimed.count === 0) throw new UserError("That order was already updated.");
    await reverseBill(tx, actor, order, "Order cancelled");
  });
}

/**
 * Edit an order's items (spec §6.7): add/remove meals, change quantities.
 * Stock is re-validated globally (excluding this order's own current items) and the
 * bill delta is written as an ORDER_BILL adjustment in the same transaction.
 * Design choice: only UNPAID orders can be edited. A paid/charged order is settled —
 * editing it would silently rewrite a completed payment — so staff delete and
 * re-create it instead. Delivered-but-unpaid orders may still be edited.
 */
export async function editOrder(actor: Viewer, orderId: string, input: { items: OrderItemInput[] }) {
  const { order } = await loadOrderFor(actor, orderId, "staff");
  if (order.status === "CANCELLED") throw new UserError("A cancelled order can't be edited.");
  if (order.paymentStatus !== "UNPAID") throw new UserError("This order is already paid — delete and re-create it to change it.");
  const items = await loadItems(input.items, order.mealDate);
  if (items.some((i) => i.option.officeId !== order.officeId)) throw new UserError("All meals in one order must be from the same office.");
  const newAmount = items.reduce((s, i) => s + i.subtotal, 0);
  return prisma.$transaction(
    async (tx) => {
      for (const it of items) await lockGroupStock(tx, it.option.groupId, order.mealDate);
      for (const it of items) await assertPortionCap(tx, it.option, order.mealDate, it.quantity, orderId);
      await tx.orderItem.deleteMany({ where: { orderId } });
      await tx.orderItem.createMany({
        data: items.map((i) => ({
          orderId,
          optionId: i.option.id,
          slot: i.option.slot,
          title: i.option.title,
          unitPrice: i.option.price,
          quantity: i.quantity,
          subtotal: i.subtotal,
        })),
      });
      await tx.order.update({ where: { id: orderId }, data: { amount: newAmount } });
      const delta = newAmount - order.amount;
      if (delta !== 0) {
        await applyLedger(tx, { userId: order.userId, type: "ORDER_BILL", amount: -delta, note: "Order edited", createdById: actor.id });
      }
      return tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
    },
    { isolationLevel: "Serializable" },
  );
}

/** Delivery only (spec §6.8): status + deliveredAt. Never charges, never pays. */
export async function markDelivered(actor: Viewer, orderId: string) {
  const { order } = await loadOrderFor(actor, orderId, "staff");
  if (order.status !== "PENDING") throw new UserError("That order isn't pending.");
  const claimed = await prisma.order.updateMany({
    where: { id: orderId, status: "PENDING" },
    data: { status: "DELIVERED", deliveredAt: new Date() },
  });
  if (claimed.count === 0) throw new UserError("That order was already updated.");
}

/**
 * The two — and only two — payment actions (spec §6.10–6.11), on delivered orders,
 * for every member regardless of account type. Idempotent: the updateMany claim on
 * paymentStatus=UNPAID means a second payment attempt fails instead of double-paying.
 */
export async function markCashPaid(actor: Viewer, orderId: string) {
  const { order } = await loadOrderFor(actor, orderId, "staff");
  if (order.status !== "DELIVERED") throw new UserError("Mark the order delivered first.");
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: { id: orderId, paymentStatus: "UNPAID" },
      data: { paymentStatus: "CASH_PAID", paidAt: new Date() },
    });
    if (claimed.count === 0) throw new UserError("This order is already paid.");
    // Cash received counts toward Total Deposit (spec §17.1) and appears in deposit history.
    await applyLedger(tx, { userId: order.userId, type: "CASH_PAYMENT", amount: order.amount, note: "Cash paid · order", createdById: actor.id });
    await writeAudit(tx, { actorId: actor.id, memberId: order.userId, action: "CASH_PAID", detail: `Order ${orderId}`, amount: order.amount });
  });
}

export async function markWalletCharged(actor: Viewer, orderId: string) {
  const { order } = await loadOrderFor(actor, orderId, "staff");
  if (order.status !== "DELIVERED") throw new UserError("Mark the order delivered first.");
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: { id: orderId, paymentStatus: "UNPAID" },
      data: { paymentStatus: "WALLET_CHARGED", paidAt: new Date() },
    });
    if (claimed.count === 0) throw new UserError("This order is already paid.");
    // No ledger movement: the bill was already counted at order creation (see invariant
    // above), and a wallet charge is NOT a deposit (spec §17.1). Balance may be negative.
    await writeAudit(tx, { actorId: actor.id, memberId: order.userId, action: "WALLET_CHARGE", detail: `Order ${orderId}`, amount: order.amount });
  });
}

/** Permanently delete an order; its bill (and any cash-paid deposit) is reversed. */
export async function deleteOrder(actor: Viewer, orderId: string) {
  const { order } = await loadOrderFor(actor, orderId, "staff");
  await prisma.$transaction(async (tx) => {
    await reverseBill(tx, actor, order, "Order deleted");
    await writeAudit(tx, { actorId: actor.id, memberId: order.userId, action: "ORDER_DELETE", detail: `Order ${orderId}`, amount: order.amount });
    await tx.order.delete({ where: { id: orderId } });
  });
}
