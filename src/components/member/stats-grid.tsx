import { Chip, StatCard } from "@/components/ui/ui";
import { statusLabel } from "@/lib/labels";
import { taka } from "@/lib/money";
import type { MemberSummary } from "@/server/summary";

/** Wallet stat cards shared by the member history page and the admin member page. */
export function StatsGrid({ s }: { s: MemberSummary }) {
  return (
    <div className="mb-6 space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Balance" value={taka(s.balance)} />
        <StatCard label="Total due" value={taka(s.totalDue)} tone={s.totalDue > 0 ? "spice" : "ink"} />
        <StatCard label="Due (wallet)" value={taka(s.dueWallet)} />
        <StatCard label="Unpaid cash orders" value={taka(s.unpaidCash)} />
        <div className="stat-card surface-card">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Payment mode</p>
          <div className="relative z-10 mt-3">
            <Chip tone="leaf">{statusLabel(s.paymentMode)}</Chip>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat label="Meals ordered">
          <b className="font-display text-lg">{s.mealsOrdered}</b>{" "}
          {s.cancelled > 0 ? <span className="text-xs text-ink-muted">({s.cancelled} cancelled)</span> : null}
        </MiniStat>
        <MiniStat label="Total meal spend">
          <b className="tnum text-lg">{taka(s.mealSpend)}</b>
        </MiniStat>
        <MiniStat label="Deposits received">
          <b className="tnum text-lg text-leaf-deep">{taka(s.depositsReceived)}</b>
        </MiniStat>
        <MiniStat label="Due payments">
          <b className="tnum text-lg">{taka(s.duePayments)}</b>
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
