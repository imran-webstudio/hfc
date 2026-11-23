import { redirect } from "next/navigation";
import { ActivityList } from "@/components/member/activity-list";
import { StatsGrid } from "@/components/member/stats-grid";
import { profileComplete, requireViewer } from "@/lib/session";
import { getMemberSummary } from "@/server/summary";

export const metadata = { title: "Your history" };

export default async function HistoryPage() {
  const viewer = await requireViewer();
  // First-time members stay on the Profile tab until setup is done (see layout).
  if (!viewer.isStaff && !profileComplete(viewer)) redirect("/app/profile");
  const summary = await getMemberSummary(viewer.id);
  return (
    <div>
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">My orders</h1>
      <p className="mb-5 text-sm text-ink-muted">Your orders, deliveries, deposits and wallet charges. A negative balance is allowed.</p>
      <StatsGrid s={summary} />
      <ActivityList items={summary.activity} heading="All Activities" />
    </div>
  );
}
