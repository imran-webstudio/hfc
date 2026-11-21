import { taka } from "@/lib/money";
import { cn } from "@/lib/cn";
import type { MemberSummary } from "@/server/summary";

/**
 * Account summary shared by the member history page and the admin member page.
 * Spec §9 order: Current Balance, Meals Ordered, Total Bill, Total Deposit —
 * with Current Balance = Total Deposit − Total Bill. The balance card itself
 * carries the account status word: Due (red) / Credit (green) / Clear (grey) —
 * no separate Due labels anywhere else on the page.
 */
export function StatsGrid({ s }: { s: MemberSummary }) {
  const status = s.balance < 0 ? "Due" : s.balance > 0 ? "Credit" : "Clear";
  return (
    <div className="mb-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="stat-card surface-card">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Current balance</p>
            <span
              className={cn(
                "relative z-10 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                status === "Due" && "bg-[#FDECEC] text-[#E03131] dark:bg-[#2B1216] dark:text-[#FF7A7A]",
                status === "Credit" && "bg-leaf/15 text-leaf-deep",
                status === "Clear" && "bg-ink/[0.06] text-ink-muted dark:bg-white/10",
              )}
            >
              {status}
            </span>
          </div>
          <p className={cn("tnum relative z-10 mt-2 text-2xl font-bold", s.balance < 0 && "text-spice-deep")}>{taka(s.balance)}</p>
        </div>
        <MiniStat label="Meals ordered">
          <b className="font-display text-lg">{s.mealsOrdered}</b>{" "}
          {s.cancelled > 0 ? <span className="text-xs text-ink-muted">({s.cancelled} cancelled)</span> : null}
        </MiniStat>
        <MiniStat label="Total bill">
          <b className="tnum text-lg">{taka(s.totalBill)}</b>
        </MiniStat>
        <MiniStat label="Total deposit">
          <b className="tnum text-lg text-leaf-deep">{taka(s.totalDeposit)}</b>
        </MiniStat>
      </div>
    </div>
  );
}

function MiniStat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="surface-card rounded-2xl px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="mt-1">{children}</p>
    </div>
  );
}
