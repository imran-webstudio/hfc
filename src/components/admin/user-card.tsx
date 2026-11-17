"use client";

import Link from "next/link";
import { useState } from "react";
import { Ban, MapPin, Repeat, Trash2, Wallet, RotateCcw } from "lucide-react";
import { assignZoneAction, banAction, deleteMemberAction, depositAction, setAccountTypeAction } from "@/actions/admin-users";
import { ConfirmDialog } from "@/components/ui/modal";
import { useAct } from "@/components/ui/use-act";
import { Chip } from "@/components/ui/ui";
import { taka } from "@/lib/money";

export type UserRow = {
  id: string;
  name: string;
  role: "USER" | "SUPER_ADMIN";
  isManager: boolean;
  banned: boolean;
  accountType: "REGULAR" | "ONE_TIME";
  zoneId: string | null;
  balance: number;
  due: number;
  wrote: string;
};

export function UserCard({ u, offices, canAssignNone }: { u: UserRow; offices: { id: string; name: string }[]; canAssignNone: boolean }) {
  const { act, pending } = useAct();
  const [depositOpen, setDepositOpen] = useState(false);
  const [amount, setAmount] = useState<number | "">(1000);
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState<"delete" | "ban" | null>(null);
  const regular = u.accountType === "REGULAR";
  const protectedRole = u.role === "SUPER_ADMIN";

  return (
    <li className="surface-card rounded-2xl px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/admin/users/${u.id}`} className="font-display text-sm font-bold text-leaf-deep hover:underline">
              {u.name}
            </Link>
            <Chip tone="muted" className="!text-[9px]">{u.role}</Chip>
            {u.isManager ? <Chip tone="amber" className="!text-[9px]">MANAGER</Chip> : null}
            {u.banned ? <Chip tone="red" className="!text-[9px]">BANNED</Chip> : null}
          </div>
          <p className="mt-0.5 text-[11px] text-ink-muted">{u.wrote || "No profile details yet"}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {u.due > 0 ? <Chip tone="red">Due {taka(u.due)}</Chip> : <span className="text-xs font-semibold">Bal {taka(u.balance)}</span>}
            <Chip tone="leaf">{regular ? "Regular" : "One-time"}</Chip>
            <label className="chip chip-leaf cursor-pointer gap-1 !pr-1">
              <MapPin className="h-3 w-3" />
              <select
                aria-label={`Assign zone for ${u.name}`}
                className="cursor-pointer appearance-auto bg-transparent text-[10.5px] font-bold outline-none [&>option]:bg-rice [&>option]:text-ink"
                value={u.zoneId ?? ""}
                disabled={pending}
                onChange={(e) => act(() => assignZoneAction(u.id, e.target.value || null), { success: "Zone updated" })}
              >
                {canAssignNone ? <option value="">Unassigned</option> : u.zoneId ? null : <option value="">Unassigned</option>}
                {offices.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button
            className="icon-btn"
            title={regular ? "Switch to One-time" : "Switch to Regular"}
            aria-label={regular ? "Switch to One-time" : "Switch to Regular"}
            disabled={pending}
            onClick={() => act(() => setAccountTypeAction(u.id, regular ? "ONE_TIME" : "REGULAR"), { success: regular ? "Switched to One-time" : "Switched to Regular" })}
          >
            <Repeat className="h-4 w-4" />
          </button>
          {regular ? (
            <button className="icon-btn" title="Deposit to wallet" aria-label="Deposit to wallet" onClick={() => setDepositOpen((o) => !o)}>
              <Wallet className="h-4 w-4" />
            </button>
          ) : null}
          {!protectedRole ? (
            <>
              <button
                className="icon-btn danger"
                title={u.banned ? "Unban member" : "Ban member"}
                aria-label={u.banned ? "Unban member" : "Ban member"}
                onClick={() => (u.banned ? act(() => banAction(u.id, false), { success: "Member unbanned" }) : setConfirm("ban"))}
              >
                {u.banned ? <RotateCcw className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
              </button>
              <button className="icon-btn danger" title={`Delete ${u.name}`} aria-label={`Delete ${u.name}`} onClick={() => setConfirm("delete")}>
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          ) : null}
        </div>
      </div>

      {depositOpen && regular ? (
        <form
          className="mt-3 flex flex-wrap items-end gap-3 border-t border-line pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            act(() => depositAction(u.id, Number(amount), note), {
              success: `Recorded ${taka(Number(amount))} for ${u.name}`,
              onOk: () => {
                setDepositOpen(false);
                setNote("");
                setAmount(1000);
              },
            });
          }}
        >
          <div className="w-44">
            <label className="field-label" htmlFor={`amt-${u.id}`}>Amount ৳</label>
            <input id={`amt-${u.id}`} type="number" min={1} required className="input" value={amount} onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))} />
          </div>
          <div className="min-w-48 flex-1">
            <label className="field-label" htmlFor={`note-${u.id}`}>Note</label>
            <input id={`note-${u.id}`} className="input" placeholder="Cash received" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-spice" disabled={pending}>
            Record
          </button>
          <button type="button" className="btn btn-text" onClick={() => setDepositOpen(false)}>
            Cancel
          </button>
        </form>
      ) : null}

      <ConfirmDialog
        open={confirm === "delete"}
        title={`Delete ${u.name}?`}
        text="This permanently deletes the member with all their orders and wallet history. This can't be undone."
        confirmLabel="Delete member"
        danger
        busy={pending}
        onClose={() => setConfirm(null)}
        onConfirm={() => act(() => deleteMemberAction(u.id), { success: "Member deleted", onOk: () => setConfirm(null) })}
      />
      <ConfirmDialog
        open={confirm === "ban"}
        title={`Ban ${u.name}?`}
        text="They will be signed out and can't sign in or order until you unban them."
        confirmLabel="Ban member"
        danger
        busy={pending}
        onClose={() => setConfirm(null)}
        onConfirm={() => act(() => banAction(u.id, true), { success: "Member banned", onOk: () => setConfirm(null) })}
      />
    </li>
  );
}
