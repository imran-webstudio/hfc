import Link from "next/link";
import { Home, LogOut, UtensilsCrossed } from "lucide-react";
import { signOutAction } from "@/actions/auth";
import { AdminTabBar, AdminTopNav } from "@/components/shell/admin-nav";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { OfflineBanner } from "@/components/ui/offline-banner";
import { requireStaff } from "@/lib/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireStaff();
  return (
    <div className="min-h-screen">
      {/* Top header on every admin page: logo + HFC / HomeFlavour Catering on the
          left, the section nav in the middle, account actions on the right. */}
      <header className="sticky top-0 z-40 border-b border-line bg-rice/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 py-2.5 lg:px-8">
          <Link href="/admin" className="flex shrink-0 items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#5B4CF5] text-white shadow-sm">
              <UtensilsCrossed className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-[19px] font-extrabold leading-none tracking-tight">HFC</span>
              <span className="mt-0.5 block text-[10.5px] font-medium leading-none text-ink-muted">HomeFlavour Catering</span>
            </span>
          </Link>
          <div className="flex flex-1 justify-center">
            <AdminTopNav showTeam={viewer.isSuperAdmin} />
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {/* Desktop keeps the header shortcut; on mobile the bottom tab bar has the App tab. */}
            <Link href="/app" className="btn btn-ghost btn-sm mr-1 max-lg:hidden" aria-label="Go to the ordering app" title="Ordering app">
              <Home className="h-4 w-4" />
              Home
            </Link>
            <ThemeToggle />
            <form action={signOutAction}>
              <button type="submit" aria-label="Sign out" title="Sign out" className="icon-btn">
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5 lg:px-8 lg:pb-12 lg:pt-8">
        <OfflineBanner />
        {children}
      </main>
      <AdminTabBar showTeam={viewer.isSuperAdmin} />
    </div>
  );
}
