"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, ShieldCheck, User, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/app", label: "Today", icon: UtensilsCrossed, exact: true },
  { href: "/app/orders", label: "History", icon: History },
  { href: "/app/profile", label: "Profile", icon: User },
];

export function MemberNav({ showAdmin }: { showAdmin: boolean }) {
  const pathname = usePathname();
  const items = showAdmin ? [...ITEMS, { href: "/admin", label: "Admin", icon: ShieldCheck }] : ITEMS;
  return (
    <nav className="flex items-center gap-1">
      {items.map(({ href, label, icon: Icon, ...rest }) => {
        const active = "exact" in rest && rest.exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition",
              active ? "bg-leaf/15 text-leaf-deep ring-1 ring-leaf/30" : "text-ink-muted hover:bg-ink/5 hover:text-ink",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
