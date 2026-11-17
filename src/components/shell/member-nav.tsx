"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, ShoppingBag, User, Wallet } from "lucide-react";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/app", label: "Order food", icon: ShoppingBag, exact: true, profile: false },
  { href: "/app/orders", label: "My orders", icon: ClipboardList, exact: false, profile: false },
  { href: "/app/profile", label: "Wallet", icon: Wallet, exact: false, profile: false },
  { href: "/app/profile", label: "Profile", icon: User, exact: false, profile: true },
];

export function MemberSideNav({ showAdmin }: { showAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="mt-6 space-y-1">
      {ITEMS.map((item) => {
        const on = item.profile ? pathname === "/app/profile" : item.exact ? pathname === item.href : item.href === "/app/profile" ? false : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "flex h-11 items-center gap-3 rounded-2xl px-3 text-sm font-medium",
              on ? "bg-[#5B4CF5]/10 text-[#5B4CF5]" : "text-ink-muted hover:bg-ink/5 hover:text-ink",
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
            {item.label}
          </Link>
        );
      })}
      {showAdmin ? (
        <Link href="/admin" className="flex h-11 items-center gap-3 rounded-2xl px-3 text-sm font-medium text-ink-muted hover:bg-ink/5 hover:text-ink">
          Admin
        </Link>
      ) : null}
    </nav>
  );
}

export function MemberPhoneNav() {
  const pathname = usePathname();
  if (pathname === "/app") return null;
  const items = [
    { href: "/app", label: "Order" },
    { href: "/app/orders", label: "Orders" },
    { href: "/app/profile", label: "Profile" },
  ];
  return (
    <nav className="fixed inset-x-0 z-40 mx-auto flex w-[min(100%-1.25rem,440px)] items-stretch justify-around rounded-full bg-[#0B0B0F] px-2 py-2 text-white lg:hidden" style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
      {items.map((item) => {
        const on = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} className={cn("flex min-h-11 flex-1 items-center justify-center rounded-full text-xs font-semibold", on ? "bg-[#D4FF3A] text-[#0B0B0F]" : "text-white/70")}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
