"use server";

import { revalidatePath } from "next/cache";
import { run } from "@/lib/action";
import { assertStaff } from "@/lib/session";
import { cancelOrder, deleteOrder, markDelivered, placeAdminOrder, setCashStatus } from "@/server/orders";
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

export async function setCashStatusAction(orderId: string, status: "CASH_PAID" | "DUE") {
  return run(async () => {
    await setCashStatus(await assertStaff(), orderId, status);
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

export async function placeOrderForMemberAction(input: {
  userId: string;
  optionId: string;
  date: string;
  quantity: number;
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

/** Meals orderable at an office on a date (for the phone-order form's Meal select). */
export async function mealsForDateAction(officeId: string, date: string) {
  return run(async () => {
    const viewer = await assertStaff();
    const scope = officeScope(viewer);
    if (scope && !scope.includes(officeId)) throw new UserError("You can't place orders for that location.");
    const opts = await optionsForDate(officeId, date);
    return opts.map((o) => {
      const left = o.remaining == null ? "" : o.remaining === 0 ? " · 0 left" : ` · ${o.remaining} left`;
      return { id: o.id, label: `${o.slot === "LUNCH" ? "Lunch" : "Dinner"} · ${o.title} — ৳${o.price}${left}` };
    });
  });
}
