import Link from "next/link";
import { Wallet } from "lucide-react";
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
            <p className={`text-[11px] font-bold uppercase tracking-wider ${negative ? "text-[#E03131]" : viewer.balance > 0 ? "text-[#1E9E5A]" : "text-ink-muted"}`}>
              {negative ? "Due" : viewer.balance > 0 ? "Credit balance" : "Balance"}
            </p>
            <p className={`tnum text-xl font-semibold ${negative ? "text-[#E03131]" : ""}`}>{money}</p>
            <p className="text-xs text-ink-muted">negative balance allowed</p>
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between gap-3 px-4 py-3 lg:hidden">
          <Link href="/app" className="text-[26px] font-extrabold leading-none tracking-tight">
            HFC
          </Link>
          {negative ? (
            <Link
              href="/app/profile"
              className="tnum inline-flex items-center gap-1.5 rounded-full bg-[#FDECEC] py-2 pl-3 pr-3.5 text-sm font-bold text-[#E03131] shadow-sm ring-1 ring-inset ring-[#E03131]/25 dark:bg-[#2B1216] dark:text-[#FF7A7A] dark:ring-[#FF7A7A]/25"
            >
              <Wallet size={16} strokeWidth={2.4} />
              Due {taka(-viewer.balance)}
            </Link>
          ) : viewer.balance > 0 ? (
            <Link
              href="/app/profile"
              className="tnum inline-flex items-center gap-1.5 rounded-full bg-[#E7F7EE] py-2 pl-3 pr-3.5 text-sm font-bold text-[#1E9E5A] shadow-sm ring-1 ring-inset ring-[#1E9E5A]/25 dark:bg-[#0F2A1D] dark:text-[#4ADE80] dark:ring-[#4ADE80]/25"
            >
              <Wallet size={16} strokeWidth={2.4} />
              Credit {taka(viewer.balance)}
            </Link>
          ) : (
            <Link
              href="/app/profile"
              className="tnum inline-flex items-center gap-1.5 rounded-full border border-line bg-rice py-2 pl-3 pr-3.5 text-sm font-bold shadow-sm"
            >
              <Wallet size={16} strokeWidth={2.4} />
              {taka(0)}
            </Link>
          )}
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
