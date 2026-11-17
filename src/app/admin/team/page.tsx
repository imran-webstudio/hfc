import { LocationCard, NewLocationForm } from "@/components/admin/team-parts";
import { requireSuperAdminPage } from "@/lib/session";
import { listOfficesWithManagers } from "@/server/offices";

export const metadata = { title: "Staff & offices" };

export default async function TeamPage() {
  await requireSuperAdminPage();
  const offices = await listOfficesWithManagers();
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 hidden text-3xl font-semibold tracking-tight lg:block">Team</h1>
      <p className="mb-6 text-sm text-ink-muted">Create offices, set cutoffs, and assign managers who can run each location.</p>
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
