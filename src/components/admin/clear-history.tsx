"use client";

import { useState } from "react";
import { clearHistoryAction } from "@/actions/admin-users";
import { ConfirmDialog } from "@/components/ui/modal";
import { useAct } from "@/components/ui/use-act";
import { taka } from "@/lib/money";

/**
 * Clear Order History (spec §8.2–8.3): complete account reset. Enabled only when the
 * balance is exactly ৳0 (also enforced server-side, atomically).
 */
export function ClearHistory({ memberId, name, balance }: { memberId: string; name: string; balance: number }) {
  const { act, pending } = useAct();
  const [confirm, setConfirm] = useState(false);
  const enabled = balance === 0;
  return (
    <div className="mt-4 border-t border-line pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn btn-ghost btn-sm text-[#E03131]" disabled={!enabled || pending} onClick={() => setConfirm(true)}>
          Clear order history
        </button>
        {!enabled ? (
          <span className="text-[11px] text-ink-muted">Available only when the balance is exactly {taka(0)} — current balance is {taka(balance)}.</span>
        ) : (
          <span className="text-[11px] text-ink-muted">Resets this account: all orders and financial history are deleted.</span>
        )}
      </div>
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
