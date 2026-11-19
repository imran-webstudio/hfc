"use server";

import { revalidatePath } from "next/cache";
import { run } from "@/lib/action";
import { assertStaff } from "@/lib/session";
import { cancelOrder, deleteOrder, editOrder, markCashPaid, markDelivered, markWalletCharged, placeAdminOrder, type OrderItemInput } from "@/server/orders";
import { searchMembers } from "@/server/members";
import { optionsForDate } from "@/server/menu";
import { officeScope } from "@/lib/session";
import { UserError } from "@/lib/action";

const refresh = () => revalidatePath("/", "layout");

export async function markDeliveredAction(orderId: string) {
  return run(async () => {
    await markDelivered(await assertStaff(), orderId);
    refresh();
  });
}

/** Payment action: Cash Paid (spec §6.10) — records the amount into Total Deposit. */
export async function markCashPaidAction(orderId: string) {
  return run(async () => {
    await markCashPaid(await assertStaff(), orderId);
    refresh();
  });
}

/** Payment action: Wallet Charge (spec §6.10) — no deposit; balance may go negative. */
export async function markWalletChargedAction(orderId: string) {
  return run(async () => {
    await markWalletCharged(await assertStaff(), orderId);
    refresh();
  });
}

export async function cancelOrderAdminAction(orderId: string) {
  return run(async () => {
    await cancelOrder(await assertStaff(), orderId);
    refresh();
  });
}

export async function deleteOrderAction(orderId: string) {
  return run(async () => {
    await deleteOrder(await assertStaff(), orderId);
    refresh();
  });
}

export async function editOrderAction(orderId: string, items: OrderItemInput[]) {
  return run(async () => {
    await editOrder(await assertStaff(), orderId, { items });
    refresh();
  });
}

export async function placeOrderForMemberAction(input: {
  userId: string;
  items: OrderItemInput[];
  date: string;
  note?: string;
}) {
  return run(async () => {
    await placeAdminOrder(await assertStaff(), input);
    refresh();
  });
}

export async function searchMembersAction(q: string, officeId?: string) {
  return run(async () => searchMembers(await assertStaff(), q, officeId));
}

/** Meals orderable at an office on a date (for the phone-order / edit-order forms). Admin-only stock numbers stay in this staff action. */
export async function mealsForDateAction(officeId: string, date: string) {
  return run(async () => {
    const viewer = await assertStaff();
    const scope = officeScope(viewer);
    if (scope && !scope.includes(officeId)) throw new UserError("You can't place orders for that location.");
    const opts = await optionsForDate(officeId, date, { includeStockedOut: true });
    return opts.map((o) => {
      const left = o.remaining == null ? "" : o.remaining === 0 ? " · sold out" : ` · ${o.remaining} left`;
      return {
        id: o.id,
        slot: o.slot,
        title: o.title,
        price: o.price,
        available: o.available,
        label: `${o.slot === "LUNCH" ? "Lunch" : "Dinner"} · ${o.title} — ৳${o.price}${left}`,
      };
    });
  });
}
