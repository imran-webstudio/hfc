import { StatCard } from "@/components/ui/ui";
import { taka } from "@/lib/money";
import type { MemberSummary } from "@/server/summary";

/**
 * Account summary shared by the member history page and the admin member page.
 * Spec §9 order: Current Balance, Meals Ordered, Total Bill, Total Deposit —
 * with Current Balance = Total Deposit − Total Bill.
 */
export function StatsGrid({ s }: { s: MemberSummary }) {
  return (
    <div className="mb-6 space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Current balance" value={taka(s.balance)} tone={s.balance < 0 ? "spice" : "ink"} />
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
      {s.totalDue > 0 ? <p className="text-xs font-semibold text-[#E03131]">Due {taka(s.totalDue)}</p> : null}
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
