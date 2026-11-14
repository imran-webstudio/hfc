"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Chip } from "@/components/ui/ui";
import { cn } from "@/lib/cn";

type Pack = { slot: string; title: string; portions: number; people: { orderId: string; name: string; zone: string; quantity: number; status: string }[] };

export function PackList({ items }: { items: Pack[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <ul className="space-y-2">
      {items.map((p) => {
        const key = `${p.slot}|${p.title}`;
        const isOpen = open === key;
        return (
          <li key={key} className="surface-card rounded-2xl">
            <button className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left" onClick={() => setOpen(isOpen ? null : key)} aria-expanded={isOpen}>
              <div>
                <p className="text-sm font-bold">{p.title}</p>
                <p className="text-[11px] text-ink-muted">{p.slot} · {p.people.length} {p.people.length === 1 ? "order" : "orders"}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-display text-xl font-bold text-leaf-deep">{p.portions}</span>
                <ChevronDown className={cn("h-4 w-4 text-ink-muted transition", isOpen && "rotate-180")} />
              </div>
            </button>
            {isOpen ? (
              <ul className="space-y-1.5 border-t border-white/5 px-4 py-3">
                {p.people.map((person) => (
                  <li key={person.orderId} className="flex items-center justify-between gap-3 text-xs">
                    <span>
                      <b>{person.name}</b> <span className="text-ink-muted">· {person.zone}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-ink-muted">× {person.quantity}</span>
                      <Chip tone={person.status === "DELIVERED" ? "leaf" : "amber"}>{person.status}</Chip>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
