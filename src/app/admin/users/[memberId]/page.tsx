import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone, User, Wallet } from "lucide-react";
import { ClearHistory } from "@/components/admin/clear-history";
import { MemberActions } from "@/components/admin/member-actions";
import { MemberDeposit } from "@/components/admin/member-deposit";
import { UserDanger } from "@/components/admin/user-danger";
import { UserRole } from "@/components/admin/user-role";
import { ActivityList } from "@/components/member/activity-list";
import { StatsGrid } from "@/components/member/stats-grid";
import { Chip, PageTitle } from "@/components/ui/ui";
import { prisma } from "@/lib/prisma";
import { officeScope, requireStaff } from "@/lib/session";
import { getMemberSummary } from "@/server/summary";

export const metadata = { title: "Member account" };

export default async function MemberAccountPage({ params }: { params: Promise<{ memberId: string }> }) {
  const viewer = await requireStaff();
  const { memberId } = await params;
  const member = await prisma.user.findUnique({ where: { id: memberId }, include: { zone: true } });
  if (!member) notFound();
  const scope = officeScope(viewer);
  if (scope && member.zoneId && !scope.includes(member.zoneId)) notFound();

  const summary = await getMemberSummary(member.id);
  const line = [member.employeeId, member.zone?.name, member.email].filter(Boolean).join(" · ");

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/admin/users" className="mb-3 inline-flex items-center gap-1 text-[11px] text-ink-muted hover:text-ink">
        <ArrowLeft className="h-3 w-3" /> Back to users
      </Link>
      <PageTitle icon={<User className="h-5 w-5" />} title="Member account">
        Full order and payment history for this person.
      </PageTitle>

      <div className="surface-card mb-4 rounded-2xl px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-leaf/15 text-leaf">
              <Wallet className="h-4 w-4" />
            </div>
            <div>
              <p className="font-display text-base font-bold">{member.name ?? member.email}</p>
              <p className="text-[11px] text-ink-muted">{line}</p>
            </div>
          </div>
          <MemberActions memberId={member.id} name={member.name ?? "member"} phone={member.phone ?? ""} balance={member.balance} />
        </div>
        {!member.banned ? <MemberDeposit memberId={member.id} name={member.name ?? "member"} /> : null}
        <UserDanger memberId={member.id} name={member.name ?? "member"} banned={member.banned} protectedRole={member.role === "SUPER_ADMIN"} />
        {viewer.isSuperAdmin ? <UserRole memberId={member.id} name={member.name ?? "member"} role={member.role} isSelf={viewer.id === member.id} /> : null}
        {member.role !== "SUPER_ADMIN" ? <ClearHistory memberId={member.id} name={member.name ?? "member"} balance={member.balance} /> : null}
        <p className="mt-3 flex items-center gap-2 text-xs">
          <Phone className="h-3.5 w-3.5 text-ink-muted" />
          <span className="text-ink-muted">Phone:</span>
          {member.phone ? (
            <a href={`tel:${member.phone}`} className="font-bold hover:underline">
              {member.phone}
            </a>
          ) : (
            <span className="text-ink-muted">—</span>
          )}
        </p>
        <div className="mt-2 flex gap-2">
          {member.role === "SUPER_ADMIN" ? <Chip tone="leaf">Admin</Chip> : null}
          {summary.totalDue > 0 ? <Chip tone="red">Due ৳{summary.totalDue.toLocaleString("en-US")}</Chip> : null}
          {member.banned ? <Chip tone="red">Banned</Chip> : null}
        </div>
      </div>

      <StatsGrid s={summary} />
      <ActivityList items={summary.activity} heading="Full history" />
    </div>
  );
}
