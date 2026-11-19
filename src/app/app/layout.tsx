import Link from "next/link";
import { CreditCard, ShieldCheck } from "lucide-react";
import { MemberPhoneNav, MemberSideNav } from "@/components/shell/member-nav";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { OfflineBanner } from "@/components/ui/offline-banner";
import { signedTaka, taka } from "@/lib/money";
import { requireViewer } from "@/lib/session";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer();
  const negative = viewer.balance < 0;
  const money = negative ? signedTaka(viewer.balance) : taka(viewer.balance);
  return (
    <div className="min-h-screen lg:flex">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-sidebar px-4 py-6 lg:flex">
        <Link href="/app">
          <span className="block text-2xl font-bold tracking-tight">HFC</span>
          <span className="text-xs text-ink-muted">Home Flavour Catering</span>
        </Link>
        <MemberSideNav showAdmin={viewer.isStaff} />
        <div className="mt-auto space-y-4">
          <ThemeToggle />
          <div className="rounded-2xl border border-line bg-rice px-3 py-3">
            <p className={`tnum text-xl font-semibold ${negative ? "text-[#E03131]" : ""}`}>{money}</p>
            <p className="text-xs text-ink-muted">negative balance allowed</p>
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between gap-3 px-4 py-3 lg:hidden">
          <Link href="/app/profile" className="inline-flex items-center gap-2 rounded-2xl border border-line bg-rice px-3 py-2 shadow-sm">
            <CreditCard className="h-4 w-4 text-amber-500" />
            <span className={`tnum text-sm font-bold ${negative ? "text-[#E03131]" : ""}`}>{money}</span>
          </Link>
          <Link href="/app" className="text-xl font-black tracking-tight">
            HFC
          </Link>
          <div className="flex items-center gap-2">
            {viewer.isStaff ? (
              <Link href="/admin" className="inline-flex items-center gap-1.5 rounded-full bg-[#5B4CF5] px-3 py-2 text-xs font-bold text-white shadow-sm">
                <ShieldCheck className="h-4 w-4" />
                Admin
              </Link>
            ) : null}
            <ThemeToggle />
          </div>
        </header>
        <main className="px-4 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-2 lg:px-8 lg:pb-12 lg:pt-8">
          <OfflineBanner />
          {children}
        </main>
      </div>
      <MemberPhoneNav showAdmin={viewer.isStaff} />
    </div>
  );
}
