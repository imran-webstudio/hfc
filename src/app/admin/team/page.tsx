import { Shield } from "lucide-react";
import { LocationCard, NewLocationForm } from "@/components/admin/team-parts";
import { PageTitle } from "@/components/ui/ui";
import { requireSuperAdminPage } from "@/lib/session";
import { listOfficesWithManagers } from "@/server/offices";

export const metadata = { title: "Staff & offices" };

export default async function TeamPage() {
  await requireSuperAdminPage();
  const offices = await listOfficesWithManagers();
  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle icon={<Shield className="h-5 w-5" />} title="Staff & offices">
        Create offices, set cutoffs, and assign managers who can run each location.
      </PageTitle>
      <NewLocationForm />
      <h2 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-ink-muted">Locations</h2>
      <ul className="space-y-4">
        {offices.map((o) => (
          <LocationCard
            key={o.id}
            office={{
              id: o.id,
              name: o.name,
              address: o.address,
              active: o.active,
              lunchCutoff: o.lunchCutoff,
              managers: o.managers.map((m) => ({ userId: m.userId, name: m.user.name ?? m.user.email ?? "Member", email: m.user.email, role: m.user.role })),
            }}
          />
        ))}
      </ul>
    </div>
  );
}
