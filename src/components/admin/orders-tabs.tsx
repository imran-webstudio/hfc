"use client";

import { useState } from "react";
import { OrderCard, type BoardOrder } from "@/components/admin/order-card";
import { cn } from "@/lib/cn";

export function OrdersTabs({ orders, filters, action }: { orders: BoardOrder[]; filters?: React.ReactNode; action?: React.ReactNode }) {
  const [tab, setTab] = useState<"PENDING" | "DELIVERED">("PENDING");
  const pending = orders.filter((o) => o.status === "PENDING");
  const delivered = orders.filter((o) => o.status === "DELIVERED");
  // Cancelled orders are deliberately NOT listed here — they live on the
  // customer's account page (full history) instead.
  const shown = tab === "PENDING" ? pending : delivered;

  return (
    <div>
      {filters ? <div className="mb-3">{filters}</div> : null}
      <div className="mb-4 grid grid-cols-2 gap-2 rounded-full bg-rice p-1 ring-1 ring-line sm:flex sm:w-fit">
        <Tab on={tab === "PENDING"} onClick={() => setTab("PENDING")}>
          Pending {pending.length}
        </Tab>
        <Tab on={tab === "DELIVERED"} onClick={() => setTab("DELIVERED")} soft>
          Delivered {delivered.length}
        </Tab>
      </div>
      {action ? <div className="mb-4">{action}</div> : null}

      {shown.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line px-4 py-10 text-center text-sm text-ink-muted">
          {tab === "PENDING" ? "No pending orders for this day." : "No delivered orders for this day."}
        </p>
      ) : (
        <ul className="space-y-3">
          {shown.map((o) => (
            <OrderCard key={o.id} o={o} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Tab({ on, soft, onClick, children }: { on: boolean; soft?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-11 rounded-full px-5 text-sm font-semibold",
        on && !soft && "bg-[#0B0B0F] text-white",
        on && soft && "bg-[#F6EFE4] text-ink dark:bg-[#2a261c]",
        !on && "text-ink-muted",
      )}
    >
      {children}
    </button>
  );
}
