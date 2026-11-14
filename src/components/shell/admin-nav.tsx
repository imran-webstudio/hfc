"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, LayoutGrid, Settings2, User, Users, UtensilsCrossed, BookOpen } from "lucide-react";
import { cn } from "@/lib/cn";

type Item = { href: string; label: string; icon: typeof LayoutGrid; exact?: boolean };

const MANAGE: Item[] = [
  { href: "/admin", label: "Overview", icon: LayoutGrid, exact: true },
  { href: "/admin/menu", label: "Menu", icon: BookOpen },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/team", label: "Staff", icon: Settings2 },
];
const APP: Item[] = [
  { href: "/app", label: "Today's meal", icon: UtensilsCrossed, exact: true },
  { href: "/app/profile", label: "Profile", icon: User },
];

function NavGroup({ label, items, horizontal }: { label: string; items: Item[]; horizontal?: boolean }) {
  const pathname = usePathname();
  return (
    <div className={horizontal ? "flex gap-1" : "mb-4"}>
      {horizontal ? null : <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-ink-muted">{label}</p>}
      <div className={horizontal ? "flex gap-1" : "space-y-0.5"}>
        {items.map(({ href, label: text, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold transition",
                active ? "bg-leaf text-[#04201c] shadow-[0_8px_24px_#2dd4bf44]" : "text-ink-muted hover:bg-white/5 hover:text-ink",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {text}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function AdminNav({ showStaff, horizontal }: { showStaff: boolean; horizontal?: boolean }) {
  return (
    <>
      <NavGroup horizontal={horizontal} label="Manage" items={showStaff ? MANAGE : MANAGE.filter((i) => i.href !== "/admin/team")} />
      <NavGroup horizontal={horizontal} label="App" items={APP} />
    </>
  );
}

const TITLES: [string, string][] = [
  ["/admin/team", "Staff"],
  ["/admin/users", "Users"],
  ["/admin/orders", "Orders"],
  ["/admin/menu", "Menu"],
  ["/admin", "Overview"],
];

export function AdminTitle() {
  const pathname = usePathname();
  return <span>{TITLES.find(([p]) => pathname.startsWith(p))?.[1] ?? "Admin"}</span>;
}
