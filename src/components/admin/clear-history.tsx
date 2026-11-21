"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { clearHistoryAction } from "@/actions/admin-users";
import { ConfirmDialog } from "@/components/ui/modal";
import { useAct } from "@/components/ui/use-act";
import { taka } from "@/lib/money";
import { cn } from "@/lib/cn";

/**
 * Clear Order History (spec §8.2–8.3): complete account reset, shown as a
 * bordered danger box under the phone row. Enabled only when the balance is
 * exactly ৳0 (also enforced server-side, atomically).
 */
export function ClearHistory({ memberId, name, balance }: { memberId: string; name: string; balance: number }) {
  const { act, pending } = useAct();
  const [confirm, setConfirm] = useState(false);
  const enabled = balance === 0;
  return (
    <div className="mt-3 rounded-2xl border border-[#E03131]/25 px-4 py-3.5 dark:border-[#E03131]/30">
      <button
        type="button"
        className={cn("flex items-center gap-2.5 text-sm font-bold text-[#E03131]", !enabled && "cursor-not-allowed opacity-60")}
        disabled={!enabled || pending}
        onClick={() => setConfirm(true)}
      >
        <Trash2 className="h-4 w-4" />
        Clear Order History
      </button>
      <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
        {enabled
          ? "Resets this account: all orders and financial history are deleted."
          : `This action activates only when the Current Balance is exactly ${taka(0)} — current balance is ${taka(balance)}.`}
      </p>
      <ConfirmDialog
        open={confirm}
        title={`Clear all history for ${name}?`}
        text="This permanently deletes every order, cash-paid and wallet-charge record, deposit and all financial history for this member. Balance, total bill and total deposit become ৳0 and both histories become empty. Their profile and login stay intact. This cannot be undone."
        confirmLabel="Clear history"
        danger
        busy={pending}
        onClose={() => setConfirm(false)}
        onConfirm={() => act(() => clearHistoryAction(memberId), { success: "History cleared — account reset", onOk: () => setConfirm(false) })}
      />
    </div>
  );
}
