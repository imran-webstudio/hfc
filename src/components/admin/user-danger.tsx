"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Trash2 } from "lucide-react";
import { banAction, deleteMemberAction } from "@/actions/admin-users";
import { ConfirmDialog } from "@/components/ui/modal";
import { useAct } from "@/components/ui/use-act";

export function UserDanger({
  memberId,
  name,
  banned,
  protectedRole,
}: {
  memberId: string;
  name: string;
  banned: boolean;
  protectedRole: boolean;
}) {
  const { act, pending } = useAct();
  const router = useRouter();
  const [confirm, setConfirm] = useState<"delete" | "ban" | null>(null);
  if (protectedRole) return null;
  return (
    <>
      <button
        className="btn min-w-0 flex-1 gap-1.5 px-1.5 text-xs bg-ink/[0.05] text-ink hover:bg-ink/10 dark:bg-white/10 dark:hover:bg-white/15"
        disabled={pending}
        onClick={() => (banned ? act(() => banAction(memberId, false), { success: "Member unbanned" }) : setConfirm("ban"))}
      >
        <Ban className="h-3.5 w-3.5 shrink-0" />
        {banned ? "Unblock" : "Block"}
      </button>
      <button className="btn min-w-0 flex-1 gap-1.5 px-1.5 text-xs bg-[#FDECEC] text-[#E03131] hover:bg-[#FBDADA] dark:bg-[#2B1216] dark:text-[#FF7A7A]" disabled={pending} onClick={() => setConfirm("delete")}>
        <Trash2 className="h-3.5 w-3.5 shrink-0" />
        Delete
      </button>
      <ConfirmDialog open={confirm === "delete"} title={`Delete ${name}?`} text="This permanently deletes the member with all their orders and wallet history." confirmLabel="Delete member" danger busy={pending} onClose={() => setConfirm(null)} onConfirm={() => act(() => deleteMemberAction(memberId), { success: "Member deleted", onOk: () => { setConfirm(null); router.push("/admin/users"); } })} />
      <ConfirmDialog open={confirm === "ban"} title={`Block ${name}?`} text="They will be signed out and can't sign in or order until you unblock them." confirmLabel="Block member" danger busy={pending} onClose={() => setConfirm(null)} onConfirm={() => act(() => banAction(memberId, true), { success: "Member blocked", onOk: () => setConfirm(null) })} />
    </>
  );
}
