"use server";

import { revalidatePath } from "next/cache";
import { run } from "@/lib/action";
import { assertViewer } from "@/lib/session";
import { cancelOrder, placeMemberOrder } from "@/server/orders";
import { updateOwnProfile, type ProfileInput } from "@/server/members";

export async function placeOrderAction(input: { optionId: string; date: string; quantity: number }) {
  return run(async () => {
    const viewer = await assertViewer();
    await placeMemberOrder(viewer, input);
    revalidatePath("/", "layout");
  });
}

export async function cancelOrderAction(orderId: string) {
  return run(async () => {
    const viewer = await assertViewer();
    await cancelOrder(viewer, orderId);
    revalidatePath("/", "layout");
  });
}

export async function saveProfileAction(input: ProfileInput) {
  return run(async () => {
    const viewer = await assertViewer();
    await updateOwnProfile(viewer.id, input);
    revalidatePath("/", "layout");
  });
}
