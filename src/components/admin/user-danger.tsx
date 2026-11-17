"use client";

import { useState } from "react";
import { banAction, deleteMemberAction, setAccountTypeAction } from "@/actions/admin-users";
import { ConfirmDialog } from "@/components/ui/modal";
import { useAct } from "@/components/ui/use-act";

export function UserDanger({
  memberId,
  name,
  banned,
  accountType,
  protectedRole,
}: {
  memberId: string;
  name: string;
  banned: boolean;
  accountType: "REGULAR" | "ONE_TIME";
  protectedRole: boolean;
}) {
  const { act, pending } = useAct();
  const [confirm, setConfirm] = useState<"delete" | "ban" | null>(null);
  const regular = accountType === "REGULAR";
  if (protectedRole) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => act(() => setAccountTypeAction(memberId, regular ? "ONE_TIME" : "REGULAR"), { success: regular ? "Switched to One-time" : "Switched to Regular" })}>
        {regular ? "Switch to one-time" : "Switch to regular"}
      </button>
      <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => (banned ? act(() => banAction(memberId, false), { success: "Member unbanned" }) : setConfirm("ban"))}>
        {banned ? "Unblock" : "Block"}
      </button>
      <button className="btn btn-ghost btn-sm text-[#E03131]" disabled={pending} onClick={() => setConfirm("delete")}>
        Delete member
      </button>
      <ConfirmDialog open={confirm === "delete"} title={`Delete ${name}?`} text="This permanently deletes the member with all their orders and wallet history." confirmLabel="Delete member" danger busy={pending} onClose={() => setConfirm(null)} onConfirm={() => act(() => deleteMemberAction(memberId), { success: "Member deleted", onOk: () => setConfirm(null) })} />
      <ConfirmDialog open={confirm === "ban"} title={`Block ${name}?`} text="They will be signed out and can't sign in or order until you unblock them." confirmLabel="Block member" danger busy={pending} onClose={() => setConfirm(null)} onConfirm={() => act(() => banAction(memberId, true), { success: "Member blocked", onOk: () => setConfirm(null) })} />
    </div>
  );
}
