import { ProfileForm } from "@/components/member/profile-form";
import { SignOutButton } from "@/components/shell/account";
import { requireViewer } from "@/lib/session";
import { listFloors, listOffices } from "@/server/offices";

export const metadata = { title: "Your profile" };

export default async function ProfilePage() {
  const viewer = await requireViewer();
  const offices = await listOffices({ activeOnly: true });
  const floors = await listFloors();
  const floorsByOffice: Record<string, string[]> = {};
  for (const f of floors) (floorsByOffice[f.officeId] ??= []).push(f.name);
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">Profile</h1>
      <p className="mb-5 text-sm text-ink-muted">Update your desk, floor, and phone. Your catering zone follows the office you select.</p>
      <ProfileForm
        offices={offices.map((o) => ({ id: o.id, name: o.name }))}
        floorsByOffice={floorsByOffice}
        zoneName={viewer.zone?.name ?? null}
        initial={{
          employeeId: viewer.employeeId ?? "",
          phone: viewer.phone ?? "",
          officeId: viewer.zoneId ?? "",
          floor: viewer.floor ?? "",
          desk: viewer.desk ?? "",
          address: viewer.address ?? "",
        }}
      />
      <div className="mt-10 flex items-center justify-between gap-3 border-t border-line pt-5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{viewer.name ?? "Signed in"}</p>
          <p className="truncate text-xs text-ink-muted">{viewer.email}</p>
        </div>
        <SignOutButton />
      </div>
    </div>
  );
}
