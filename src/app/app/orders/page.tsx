import { History } from "lucide-react";
import { ActivityList } from "@/components/member/activity-list";
import { StatsGrid } from "@/components/member/stats-grid";
import { PageTitle } from "@/components/ui/ui";
import { requireViewer } from "@/lib/session";
import { getMemberSummary } from "@/server/summary";

export const metadata = { title: "Your history" };

export default async function HistoryPage() {
  const viewer = await requireViewer();
  const summary = await getMemberSummary(viewer.id);
  return (
    <div>
      <PageTitle icon={<History className="h-5 w-5" />} title="Your history">
        Your orders, deliveries, deposits and wallet charges.
      </PageTitle>
      <StatsGrid s={summary} />
      <ActivityList items={summary.activity} heading="All activity" />
    </div>
  );
}
