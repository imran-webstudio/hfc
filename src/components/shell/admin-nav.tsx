"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, LayoutGrid, Settings2, Users, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/cn";

type Item = { href: string; label: string; short: string; icon: typeof LayoutGrid; exact?: boolean };

const ITEMS: Item[] = [
  { href: "/admin", label: "Dashboard", short: "Home", icon: LayoutGrid, exact: true },
  { href: "/admin/menu", label: "Menu", short: "Menu", icon: UtensilsCrossed },
  { href: "/admin/orders", label: "Orders", short: "Orders", icon: ClipboardList },
  { href: "/admin/users", label: "Users & deposits", short: "Users", icon: Users },
  { href: "/admin/team", label: "Team", short: "Team", icon: Settings2 },
];

function active(pathname: string, item: Item) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

/** Centre navigation of the admin top header (desktop). Mobile uses the tab bar. */
export function AdminTopNav({ showTeam }: { showTeam: boolean }) {
  const pathname = usePathname();
  const items = showTeam ? ITEMS : ITEMS.filter((i) => i.href !== "/admin/team");
  return (
    <nav className="hidden items-center gap-1 lg:flex" aria-label="Admin">
      {items.map((item) => {
        const on = active(pathname, item);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition",
              on ? "bg-[#5B4CF5]/10 text-[#5B4CF5] dark:bg-[#5B4CF5]/20 dark:text-[#C4BCFF]" : "text-ink-muted hover:bg-ink/5 hover:text-ink",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.short}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminTabBar() {
  const pathname = usePathname();
  const items = ITEMS.filter((i) => i.href !== "/admin/team");
  return (
    <nav
      className="fixed inset-x-0 z-40 mx-auto flex w-[min(100%-1.25rem,440px)] items-stretch justify-around rounded-full bg-[#0B0B0F] px-1.5 py-1.5 text-white shadow-[0_12px_40px_rgba(0,0,0,0.28)] lg:hidden"
      style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      aria-label="Admin"
    >
      {items.map((item) => {
        const on = active(pathname, item);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1 py-1 text-[10px] font-semibold",
              on ? "text-[#D4FF3A]" : "text-white/55",
            )}
          >
            <Icon className="h-5 w-5" />
            {item.short}
          </Link>
        );
      })}
    </nav>
  );
}
