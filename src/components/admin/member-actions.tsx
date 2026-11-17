"use client";

import { useState } from "react";
import { Pencil, Wallet } from "lucide-react";
import { editBalanceAction, editPhoneAction } from "@/actions/admin-users";
import { Modal } from "@/components/ui/modal";
import { useAct } from "@/components/ui/use-act";
import { taka } from "@/lib/money";

export function MemberActions({ memberId, name, phone, balance }: { memberId: string; name: string; phone: string; balance: number }) {
  const { act, pending } = useAct();
  const [dialog, setDialog] = useState<"phone" | "balance" | null>(null);
  const [phoneVal, setPhoneVal] = useState(phone);
  const [balanceVal, setBalanceVal] = useState<number | "">(balance);
  const close = () => setDialog(null);

  return (
    <>
      <div className="flex gap-1.5">
        <button
          className="icon-btn"
          title="Edit phone"
          aria-label="Edit phone"
          onClick={() => {
            setPhoneVal(phone);
            setDialog("phone");
          }}
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          className="icon-btn"
          title="Edit balance"
          aria-label="Edit balance"
          onClick={() => {
            setBalanceVal(balance);
            setDialog("balance");
          }}
        >
          <Wallet className="h-4 w-4" />
        </button>
      </div>

      <Modal open={dialog === "phone"} onClose={close} title="Edit phone number" subtitle={`Set phone for ${name}.`} variant="question">
        <form
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            act(() => editPhoneAction(memberId, phoneVal), { success: "Phone updated", onOk: close });
          }}
        >
          <label className="field-label text-center" htmlFor="edit-phone">Phone number</label>
          <input id="edit-phone" type="tel" className="input" placeholder="01712345678" autoFocus value={phoneVal} onChange={(e) => setPhoneVal(e.target.value)} />
          <div className="mt-5 flex justify-center gap-3">
            <button type="button" className="btn btn-ghost" onClick={close}>Cancel</button>
            <button type="submit" className="btn btn-leaf" disabled={pending}>Save phone</button>
          </div>
        </form>
      </Modal>

      <Modal open={dialog === "balance"} onClose={close} title="Edit balance" subtitle={`Current balance: ${taka(balance)}. Enter the new wallet balance.`} variant="question">
        <form
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (balanceVal === "") return;
            act(() => editBalanceAction(memberId, Number(balanceVal)), { success: "Balance updated", onOk: close });
          }}
        >
          <label className="field-label text-center" htmlFor="edit-balance">New balance (৳)</label>
          <input id="edit-balance" type="number" required className="input" autoFocus value={balanceVal} onChange={(e) => setBalanceVal(e.target.value === "" ? "" : Number(e.target.value))} />
          <div className="mt-5 flex justify-center gap-3">
            <button type="button" className="btn btn-ghost" onClick={close}>Cancel</button>
            <button type="submit" className="btn btn-leaf" disabled={pending}>Save balance</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
