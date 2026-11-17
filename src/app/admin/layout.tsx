import Link from "next/link";
import { LogOut } from "lucide-react";
import { signOutAction } from "@/actions/auth";
import { AccountFigure } from "@/components/shell/account";
import { AdminPhoneBar, AdminSideNav, AdminTabBar } from "@/components/shell/admin-nav";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { OfflineBanner } from "@/components/ui/offline-banner";
import { requireStaff } from "@/lib/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireStaff();
  const first = (viewer.name ?? "there").split(" ")[0];
  return (
    <div className="min-h-screen lg:flex">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-sidebar px-3 py-5 lg:flex">
        <Link href="/admin" className="mb-6 px-3">
          <span className="block text-lg font-semibold tracking-tight">HFC</span>
          <span className="block text-[11px] font-medium text-ink-muted">Home Flavour Catering</span>
        </Link>
        <AdminSideNav showTeam={viewer.isSuperAdmin} />
        <div className="mt-auto space-y-3 border-t border-line pt-4">
          <div className="flex items-center justify-between gap-2 px-1">
            <AccountFigure userId={viewer.id} name={viewer.name ?? "Admin"} align="left" />
            <form action={signOutAction}>
              <button type="submit" aria-label="Sign out" className="icon-btn">
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
          <Link href="/app" className="block px-2 text-xs font-medium text-ink-muted hover:text-ink">
            Ordering app
          </Link>
          <ThemeToggle labeled />
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <AdminPhoneBar firstName={first} />
        <main className="px-4 pb-[calc(12rem+env(safe-area-inset-bottom))] pt-1 lg:px-8 lg:pb-12 lg:pt-8">
          <OfflineBanner />
          {children}
        </main>
      </div>
      <AdminTabBar />
    </div>
  );
}
