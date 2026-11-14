import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AccountFigure, SignOutButton } from "@/components/shell/account";
import { AdminNav, AdminTitle } from "@/components/shell/admin-nav";
import { Brand } from "@/components/shell/brand";
import { requireStaff } from "@/lib/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireStaff();
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/5 bg-[#0c1210]/90 backdrop-blur-xl md:flex">
        <div className="border-b border-white/5 px-4 py-4">
          <Brand href="/admin" stacked />
          <p className="mt-1 pl-[38px] text-[11px] text-ink-muted">Admin dashboard</p>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <AdminNav showStaff={viewer.isSuperAdmin} />
        </div>
        <div className="border-t border-white/5 p-4">
          <AccountFigure userId={viewer.id} name={viewer.name ?? "Admin"} align="left" />
          <div className="mt-2">
            <SignOutButton />
          </div>
        </div>
      </aside>
      <div className="md:pl-64">
        <div className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-white/5 bg-cream/70 px-5 text-xs font-bold backdrop-blur-xl">
          <AdminTitle />
          <Link href="/app" className="flex items-center gap-1 text-[11px] font-medium text-ink-muted hover:text-ink">
            <ArrowLeft className="h-3 w-3" /> Back to app
          </Link>
        </div>
        <div className="flex gap-1 overflow-x-auto border-b border-white/5 px-3 py-2 md:hidden">
          <AdminNav showStaff={viewer.isSuperAdmin} horizontal />
        </div>
        <main className="mx-auto max-w-6xl px-4 pb-40 pt-8 md:px-6">{children}</main>
      </div>
    </div>
  );
}
