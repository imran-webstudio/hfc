"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";
import { depositAction } from "@/actions/admin-users";
import { Modal } from "@/components/ui/modal";
import { useAct } from "@/components/ui/use-act";

/**
 * "Add Money / Make deposit" on a member's account page — shares one row with the
 * Block and Delete buttons so staff can deposit to this member without leaving.
 */
export function MemberDeposit({ memberId, name }: { memberId: string; name: string }) {
  const { act, pending } = useAct();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number | "">(500);
  const [note, setNote] = useState("Cash received");
  const close = () => setOpen(false);

  return (
    <>
      <button type="button" className="btn min-w-0 flex-1 gap-1.5 px-1.5 text-xs bg-[#D4FF3A] text-[#0B0B0F] hover:bg-[#c6f020]" onClick={() => setOpen(true)}>
        <Wallet className="h-3.5 w-3.5 shrink-0" /> Add Money
      </button>
      <Modal open={open} onClose={close} title="Add money" subtitle={`Deposit to ${name}'s account.`} variant="question">
        <form
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (amount === "" || Number(amount) <= 0) return;
            act(() => depositAction(memberId, Number(amount), note), { success: "Deposit recorded", onOk: close });
          }}
        >
          <label className="field-label" htmlFor="member-deposit-amt">Amount ৳</label>
          <input
            id="member-deposit-amt"
            type="number"
            min={1}
            required
            autoFocus
            className="input mb-3"
            value={amount}
            onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
          />
          <label className="field-label" htmlFor="member-deposit-note">Note</label>
          <input id="member-deposit-note" className="input mb-4" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex justify-center gap-3">
            <button type="button" className="btn btn-ghost" onClick={close}>
              Cancel
            </button>
            <button type="submit" className="btn btn-leaf" disabled={pending}>
              Record deposit
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
