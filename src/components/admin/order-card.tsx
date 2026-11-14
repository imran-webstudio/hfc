"use client";

import Link from "next/link";
import { Phone } from "lucide-react";
import { cancelOrderAdminAction, markDeliveredAction, setCashStatusAction } from "@/actions/admin-orders";
import { useAct } from "@/components/ui/use-act";
import { Chip } from "@/components/ui/ui";
import { taka } from "@/lib/money";

export type BoardOrder = {
  id: string;
  memberId: string;
  memberName: string;
  employeeId: string | null;
  place: string;
  accountType: "REGULAR" | "ONE_TIME";
  slot: string;
  title: string;
  quantity: number;
  amount: number;
  status: "PENDING" | "DELIVERED" | "CANCELLED";
  paymentStatus: "UNPAID" | "WALLET_CHARGED" | "CASH_PAID" | "DUE";
  note: string | null;
  placedBy: string | null;
};

const tone = (s: string) => (s === "DELIVERED" || s === "WALLET_CHARGED" || s === "CASH_PAID" ? "leaf" : s === "CANCELLED" ? "red" : "amber");

export function OrderCard({ o }: { o: BoardOrder }) {
  const { act, pending } = useAct();
  const needsCash = o.status === "DELIVERED" && o.accountType === "ONE_TIME" && (o.paymentStatus === "UNPAID" || o.paymentStatus === "DUE");

  return (
    <li className="surface-card rounded-2xl px-4 py-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/admin/users/${o.memberId}`} className="text-sm font-bold text-leaf-deep hover:underline">
            {o.memberName}
          </Link>
          {o.employeeId ? <span className="ml-2 text-[11px] text-ink-muted">{o.employeeId}</span> : null}
          <p className="text-[11px] text-ink-muted">{o.place}</p>
          <p className="mt-1 text-sm font-semibold">
            <span className="mr-2 text-[10px] font-bold uppercase tracking-wider text-ink-muted">{o.slot}</span>
            {o.title}
            {o.quantity > 1 ? <span className="text-ink-muted"> × {o.quantity}</span> : null}
          </p>
          {o.note ? <p className="text-[11px] text-ink-muted">{o.note}</p> : null}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <p className="text-sm font-bold">{taka(o.amount)}</p>
          <div className="flex flex-wrap justify-end gap-1">
            <Chip tone={tone(o.status)}>{o.status}</Chip>
            <Chip tone={tone(o.paymentStatus)}>{o.paymentStatus}</Chip>
            <Chip tone="muted">{o.accountType === "REGULAR" ? "Regular" : "One-time"}</Chip>
            {o.placedBy ? (
              <Chip tone="amber">
                <Phone className="h-2.5 w-2.5" /> by {o.placedBy}
              </Chip>
            ) : null}
          </div>
        </div>
      </div>

      {o.status === "PENDING" || needsCash ? (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-white/5 pt-3">
          {o.status === "PENDING" ? (
            <>
              <button className="btn btn-leaf btn-sm" disabled={pending} onClick={() => act(() => markDeliveredAction(o.id), { success: o.accountType === "REGULAR" ? "Delivered — wallet charged" : "Delivered" })}>
                Mark delivered
              </button>
              <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => act(() => cancelOrderAdminAction(o.id), { success: "Order cancelled" })}>
                Cancel order
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-leaf btn-sm" disabled={pending} onClick={() => act(() => setCashStatusAction(o.id, "CASH_PAID"), { success: "Marked cash paid" })}>
                Cash paid
              </button>
              {o.paymentStatus !== "DUE" ? (
                <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => act(() => setCashStatusAction(o.id, "DUE"), { success: "Marked due" })}>
                  Due
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </li>
  );
}
