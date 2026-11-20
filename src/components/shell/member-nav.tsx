"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Home, ShieldCheck, User } from "lucide-react";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/app", label: "Home", icon: Home, exact: true },
  { href: "/app/orders", label: "My Orders", icon: ClipboardList, exact: false },
  { href: "/app/profile", label: "Profile", icon: User, exact: false },
];

export function MemberSideNav({ showAdmin }: { showAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="mt-6 space-y-1">
      {ITEMS.map((item) => {
        const on = item.exact ? pathname === item.href : pathname.startsWith(item.href);
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
          <ShieldCheck className="h-[18px] w-[18px]" />
          Admin panel
        </Link>
      ) : null}
    </nav>
  );
}

/**
 * Floating bottom bar, visible on every member screen (including Home, where the
 * checkout pill stacks above it). Items spread evenly across the pill; staff get
 * one extra item — Admin — as the last (rightmost) entry.
 */
export function MemberPhoneNav({ showAdmin }: { showAdmin: boolean }) {
  const pathname = usePathname();
  const items = [
    ...ITEMS,
    ...(showAdmin ? [{ href: "/admin", label: "Admin", icon: ShieldCheck, exact: false }] : []),
  ];
  return (
    <nav
      className="fixed inset-x-0 z-40 mx-auto flex w-[min(100%-1.25rem,440px)] items-stretch justify-between rounded-full bg-[#0B0B0F] px-6 py-2 text-white shadow-[0_12px_32px_rgba(0,0,0,0.35)] ring-1 ring-white/10 lg:hidden"
      style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      aria-label="Main"
    >
      {items.map((item) => {
        const on = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href + item.label}
            href={item.href}
            aria-current={on ? "page" : undefined}
            className={cn("flex min-h-11 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold", on ? "text-[#9D8FFF]" : "text-white/65")}
          >
            <Icon className="h-[22px] w-[22px]" strokeWidth={on ? 2.2 : 1.9} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
