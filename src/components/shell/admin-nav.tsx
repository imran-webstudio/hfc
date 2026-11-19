"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, LayoutGrid, LogOut, Settings2, Users, UtensilsCrossed } from "lucide-react";
import { signOutAction } from "@/actions/auth";
import { OrderSearchButton } from "@/components/admin/filters";
import { cn } from "@/lib/cn";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { greeting } from "@/lib/time";

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

export function AdminSideNav({ showTeam }: { showTeam: boolean }) {
  const pathname = usePathname();
  const items = showTeam ? ITEMS : ITEMS.filter((i) => i.href !== "/admin/team");
  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const on = active(pathname, item);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex h-11 items-center gap-3 rounded-2xl px-3 text-sm font-medium transition",
              on ? "bg-[#5B4CF5]/10 text-[#5B4CF5] dark:bg-[#5B4CF5]/20 dark:text-[#C4BCFF]" : "text-ink-muted hover:bg-ink/5 hover:text-ink",
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
            {item.label}
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

const TITLES: [string, string][] = [
  ["/admin/team", "Team"],
  ["/admin/users", "Users"],
  ["/admin/orders", "Orders"],
  ["/admin/menu", "Menu"],
];

export function AdminPhoneBar({ firstName }: { firstName: string }) {
  const pathname = usePathname();
  const home = pathname === "/admin";
  const title = TITLES.find(([p]) => pathname.startsWith(p))?.[1] ?? "Admin";
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 backdrop-blur-xl lg:hidden" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
      {home ? (
        <h1 className="min-w-0 truncate text-[1.35rem] font-semibold tracking-tight">{greeting(firstName)}</h1>
      ) : (
        <h1 className="min-w-0 truncate text-[1.7rem] font-semibold tracking-tight">{title}</h1>
      )}
      <div className="flex shrink-0 items-center gap-2">
        {pathname.startsWith("/admin/orders") ? (
          <Suspense fallback={null}>
            <OrderSearchButton />
          </Suspense>
        ) : null}
        {home ? (
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[#5B4CF5] text-sm font-semibold text-white" aria-hidden>
            {firstName.slice(0, 1).toUpperCase()}
          </span>
        ) : null}
        <form action={signOutAction}>
          <button type="submit" aria-label="Sign out" className="icon-btn">
            <LogOut className="h-4 w-4" />
          </button>
        </form>
        <ThemeToggle />
      </div>
    </header>
  );
}
