"use client";

import { useState } from "react";
import { Crown, ShieldCheck } from "lucide-react";
import { setRoleAction } from "@/actions/admin-users";
import { ConfirmDialog } from "@/components/ui/modal";
import { useAct } from "@/components/ui/use-act";

/**
 * Role control on the member account page (super admins only):
 * promote a member to Admin, or remove admin from another admin.
 * The server refuses self-changes and demoting the last admin.
 */
export function UserRole({
  memberId,
  name,
  role,
  isSelf,
}: {
  memberId: string;
  name: string;
  role: "USER" | "SUPER_ADMIN";
  isSelf: boolean;
}) {
  const { act, pending } = useAct();
  const [confirm, setConfirm] = useState(false);
  const isAdmin = role === "SUPER_ADMIN";
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted">
        <ShieldCheck className="h-3.5 w-3.5" />
        Role: <span className="font-bold text-ink">{isAdmin ? "Admin" : "Member"}</span>
      </span>
      {isSelf ? (
        <span className="text-xs text-ink-muted">(this is you — your own role can&rsquo;t be changed here)</span>
      ) : (
        <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => setConfirm(true)}>
          <Crown className="h-4 w-4 text-[#B8860B] dark:text-[#FFC94D]" />
          {isAdmin ? "Remove admin" : "Make admin"}
        </button>
      )}
      <ConfirmDialog
        open={confirm}
        title={isAdmin ? `Remove admin from ${name}?` : `Make ${name} an admin?`}
        text={
          isAdmin
            ? "They will lose access to the admin panel and go back to being a regular member."
            : "They will get full access to the admin panel: orders, menus, deposits and member accounts."
        }
        confirmLabel={isAdmin ? "Remove admin" : "Make admin"}
        danger={isAdmin}
        busy={pending}
        onClose={() => setConfirm(false)}
        onConfirm={() =>
          act(() => setRoleAction(memberId, isAdmin ? "USER" : "SUPER_ADMIN"), {
            success: isAdmin ? "Admin removed" : "Admin granted",
            onOk: () => setConfirm(false),
          })
        }
      />
    </div>
  );
}
