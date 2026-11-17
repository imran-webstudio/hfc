import type { Office, Slot } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { UserError } from "@/lib/action";
import { config } from "@/lib/config";
import { addDays, cutoffPassed, isDateStr, todayStr } from "@/lib/time";
import { canManageOffice, type Viewer } from "@/lib/session";
import { assertPortionCap } from "@/server/menu";
import { applyLedger } from "@/server/wallet";

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
  const out = await prisma.stockOut.findUnique({ where: { optionId_date: { optionId, date } } });
  if (out) throw new UserError("Sorry, that meal is out of stock.");
  return option;
}

/** Member orders a meal for themselves (cutoffs, day-offs, stock and wallet limits apply). */
export async function placeMemberOrder(viewer: Viewer, input: { optionId: string; date: string; quantity: number }) {
  validateDate(input.date, { allowPast: false });
  validateQty(input.quantity);
  if (!viewer.zoneId) throw new UserError("Choose your office in Profile first.");
  const option = await loadOption(input.optionId, input.date);
  if (option.officeId !== viewer.zoneId) throw new UserError("That meal isn't offered at your location.");

  const state = slotState(option.office, input.date, option.slot, await isDayOff(option.officeId, input.date));
  if (!state.open) throw new UserError(state.reason ?? "Ordering is closed.");

  const amount = option.price * input.quantity;
  if (viewer.accountType === "REGULAR") {
    const pending = await prisma.order.aggregate({
      where: { userId: viewer.id, status: "PENDING" },
      _sum: { amount: true },
    });
    const projectedDue = Math.max(0, -viewer.balance) + (pending._sum.amount ?? 0) + amount;
    if (projectedDue > config.maxWalletDue) {
      throw new UserError(`Your wallet due would exceed ৳${config.maxWalletDue}. Please deposit with your office admin first.`);
    }
  }

  return prisma.$transaction(async (tx) => {
    const dup = await tx.order.findFirst({
      where: { userId: viewer.id, mealDate: input.date, slot: option.slot, status: { not: "CANCELLED" } },
    });
    if (dup) throw new UserError(`You already have a ${option.slot.toLowerCase()} order for this day. Cancel it to change.`);
    await assertPortionCap(tx, option, input.date, input.quantity);
    return tx.order.create({
      data: {
        userId: viewer.id,
        officeId: option.officeId,
        optionId: option.id,
        slot: option.slot,
        mealDate: input.date,
        title: option.title,
        unitPrice: option.price,
        quantity: input.quantity,
        amount,
      },
    });
  });
}

/** Staff places an order on behalf of a member (e.g. phone order). Cutoffs are skipped. */
export async function placeAdminOrder(
  actor: Viewer,
  input: { userId: string; optionId: string; date: string; quantity: number; note?: string },
) {
  validateDate(input.date, { allowPast: false });
  validateQty(input.quantity);
  const member = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!member) throw new UserError("Choose a member.");
  if (member.banned) throw new UserError("That member is banned.");
  const option = await loadOption(input.optionId, input.date);
  if (!canManageOffice(actor, option.officeId)) throw new UserError("You can't place orders for that location.");

  return prisma.$transaction(async (tx) => {
    await assertPortionCap(tx, option, input.date, input.quantity);
    return tx.order.create({
      data: {
        userId: member.id,
        officeId: option.officeId,
        optionId: option.id,
        slot: option.slot,
        mealDate: input.date,
        title: option.title,
        unitPrice: option.price,
        quantity: input.quantity,
        amount: option.price * input.quantity,
        note: input.note?.trim() || "Phone order",
        placedById: actor.id,
      },
    });
  });
}

async function loadOrderFor(actor: Viewer, orderId: string, mode: "staff" | "owner-or-staff") {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { office: true, user: true } });
  if (!order) throw new UserError("Order not found.");
  const isOwner = order.userId === actor.id;
  const isStaffHere = actor.isStaff && canManageOffice(actor, order.officeId);
  if (mode === "staff" ? !isStaffHere : !(isOwner || isStaffHere)) throw new UserError("You can't change that order.");
  return { order, isStaffHere };
}

export async function cancelOrder(actor: Viewer, orderId: string) {
  const { order, isStaffHere } = await loadOrderFor(actor, orderId, "owner-or-staff");
  if (order.status !== "PENDING") throw new UserError("Only pending orders can be cancelled.");
  if (!isStaffHere && cutoffPassed(order.mealDate, slotCutoff(order.office, order.slot))) {
    throw new UserError("The cutoff has passed — ask your office admin to cancel.");
  }
  await prisma.order.update({ where: { id: orderId }, data: { status: "CANCELLED", cancelledAt: new Date() } });
}

/** Handover: Regular members are charged to their wallet, One-time members settle cash afterwards. */
export async function markDelivered(actor: Viewer, orderId: string) {
  const { order } = await loadOrderFor(actor, orderId, "staff");
  if (order.status !== "PENDING") throw new UserError("That order isn't pending.");
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: { id: orderId, status: "PENDING" },
      data: { status: "DELIVERED", deliveredAt: new Date() },
    });
    if (claimed.count === 0) throw new UserError("That order was already updated.");
    if (order.user.accountType === "REGULAR") {
      await tx.user.update({ where: { id: order.userId }, data: { balance: { decrement: order.amount } } });
      await tx.order.update({ where: { id: orderId }, data: { paymentStatus: "WALLET_CHARGED" } });
    }
  });
}

/** One-time members: mark a delivered order as paid in cash, or leave it as due. */
export async function setCashStatus(actor: Viewer, orderId: string, status: "CASH_PAID" | "DUE") {
  const { order } = await loadOrderFor(actor, orderId, "staff");
  if (order.status !== "DELIVERED") throw new UserError("Mark the order delivered first.");
  if (order.paymentStatus === "WALLET_CHARGED") throw new UserError("This order was already charged to the wallet.");
  await prisma.order.update({ where: { id: orderId }, data: { paymentStatus: status } });
}

/** Permanently delete an order; wallet charges are refunded. */
export async function deleteOrder(actor: Viewer, orderId: string) {
  const { order } = await loadOrderFor(actor, orderId, "staff");
  await prisma.$transaction(async (tx) => {
    if (order.paymentStatus === "WALLET_CHARGED") {
      await applyLedger(tx, {
        userId: order.userId,
        type: "REFUND",
        amount: order.amount,
        note: `Refund · ${order.title}`,
        createdById: actor.id,
      });
    }
    await tx.order.delete({ where: { id: orderId } });
  });
}
