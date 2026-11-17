"use client";

import Link from "next/link";
import { Clock } from "lucide-react";
import { cancelOrderAdminAction, markDeliveredAction, setCashStatusAction } from "@/actions/admin-orders";
import { useAct } from "@/components/ui/use-act";
import { taka } from "@/lib/money";
import { cn } from "@/lib/cn";

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
  deliveredLabel: string | null;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

const AVATARS = [
  { bg: "#5B4CF5", fg: "#ffffff" },
  { bg: "#D4FF3A", fg: "#0B0B0F" },
  { bg: "#FB7185", fg: "#ffffff" },
  { bg: "#0F9B8E", fg: "#ffffff" },
];

function avatar(name: string) {
  let n = 0;
  for (const c of name) n = (n + c.charCodeAt(0)) % AVATARS.length;
  return AVATARS[n];
}

export function OrderCard({ o }: { o: BoardOrder }) {
  const { act, pending } = useAct();
  const color = avatar(o.memberName);
  const settled = o.paymentStatus === "CASH_PAID" || o.paymentStatus === "WALLET_CHARGED";
  const meal = `${o.slot === "LUNCH" ? "Lunch" : o.slot === "DINNER" ? "Dinner" : o.slot} · ${o.title}${o.quantity > 1 ? ` ×${o.quantity}` : ""}`;

  return (
    <li className="surface-card rounded-[1.5rem] p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-bold" style={{ background: color.bg, color: color.fg }}>
          {initials(o.memberName)}
        </span>
        <div className="min-w-0 flex-1">
          <Link href={`/admin/users/${o.memberId}`} className="text-base font-semibold tracking-tight hover:underline">
            {o.memberName}
          </Link>
          <p className="truncate text-sm text-ink-muted">{o.place}</p>
        </div>
        {o.status === "DELIVERED" ? (
          <p className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
            <span className="h-2 w-2 rounded-full bg-[#3DDC97]" />
            {o.deliveredLabel ?? "Delivered"}
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="text-sm text-ink-muted">{meal}</p>
        <p className="tnum text-2xl font-semibold tracking-tight">{taka(o.amount)}</p>
      </div>
      {o.note ? <p className="mt-1 text-xs text-ink-muted">{o.note}</p> : null}

      {o.status === "PENDING" ? (
        <>
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#F6E7C1] px-2.5 py-1 text-xs font-semibold text-[#8A5A12] dark:bg-[#3a3018] dark:text-[#F6E7C1]">
            <Clock className="h-3.5 w-3.5" /> Pending
          </p>
          <div className="mt-3 grid grid-cols-[minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,1.25fr)] gap-2">
            <Link href={`/admin/users/${o.memberId}`} className="btn btn-ghost btn-squeeze">
              Edit
            </Link>
            <button className="btn btn-ghost btn-squeeze" disabled={pending} onClick={() => act(() => cancelOrderAdminAction(o.id), { success: "Order cancelled" })}>
              Cancel
            </button>
            <button
              className="btn btn-squeeze bg-[#5B4CF5] text-white hover:bg-[#4636e0]"
              disabled={pending}
              onClick={() => act(() => markDeliveredAction(o.id), { success: o.accountType === "REGULAR" ? "Delivered — wallet charged" : "Delivered" })}
            >
              Mark delivered
            </button>
          </div>
        </>
      ) : null}

      {o.status === "DELIVERED" ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            className={cn("btn keep h-12 w-full bg-[#0B0B0F] text-white hover:bg-black", o.paymentStatus === "CASH_PAID" && "ring-2 ring-[#D4FF3A]")}
            disabled={pending || settled}
            onClick={() => act(() => setCashStatusAction(o.id, "CASH_PAID"), { success: "Marked cash paid" })}
          >
            Cash paid
          </button>
          <button
            className={cn("btn keep h-12 w-full bg-[#D4FF3A] text-[#0B0B0F] hover:bg-[#c6f020]", o.paymentStatus === "WALLET_CHARGED" && "ring-2 ring-[#0B0B0F]")}
            disabled={pending || settled || o.accountType !== "REGULAR"}
            onClick={() => act(() => markDeliveredAction(o.id), { success: "Wallet charged" })}
          >
            Wallet charge
          </button>
        </div>
      ) : null}

      {o.status === "CANCELLED" ? <p className="mt-3 text-sm font-semibold text-[#E03131]">Cancelled</p> : null}
    </li>
  );
}
