import { Sparkles } from "lucide-react";
import { ProfileForm } from "@/components/member/profile-form";
import { SignOutButton } from "@/components/shell/account";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { profileComplete, requireViewer } from "@/lib/session";
import { listCompanies, listFloors, listOffices } from "@/server/offices";

export const metadata = { title: "Your profile" };

export default async function ProfilePage() {
  const viewer = await requireViewer();
  const firstTime = !viewer.isStaff && !profileComplete(viewer);
  const offices = await listOffices({ activeOnly: true });
  const floors = await listFloors();
  const floorsByOffice: Record<string, string[]> = {};
  for (const f of floors) (floorsByOffice[f.officeId] ??= []).push(f.name);
  const companies = await listCompanies();
  const companiesByOffice: Record<string, string[]> = {};
  for (const c of companies) (companiesByOffice[c.officeId] ??= []).push(c.name);
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">Profile</h1>
      <p className="mb-5 text-sm text-ink-muted">Update your company, floor, and phone. Your catering zone follows the building you select.</p>
      {firstTime ? (
        <div className="mb-5 rounded-2xl border border-[#5B4CF5]/30 bg-[#5B4CF5]/10 px-4 py-3.5">
          <p className="flex items-center gap-2 text-[15px] font-bold">
            <Sparkles className="h-4.5 w-4.5 shrink-0 text-[#5B4CF5]" />
            Welcome to HomeFlavour Catering!
          </p>
          <p className="mt-1 text-sm text-ink-muted">Set up your profile first — after saving, the main menu opens and you can place your first order.</p>
        </div>
      ) : null}
      <ProfileForm
        firstTime={firstTime}
        offices={offices.map((o) => ({ id: o.id, name: o.name }))}
        floorsByOffice={floorsByOffice}
        companiesByOffice={companiesByOffice}
        zoneName={viewer.zone?.name ?? null}
        initial={{
          employeeId: viewer.employeeId ?? "",
          phone: viewer.phone ?? "",
          officeId: viewer.zoneId ?? "",
          floor: viewer.floor ?? "",
          company: viewer.company ?? "",
          address: viewer.address ?? "",
        }}
      />
      <div className="mt-10 flex items-center justify-between gap-3 border-t border-line pt-5 lg:hidden">
        <p className="text-sm font-semibold">Appearance</p>
        <ThemeToggle labeled />
      </div>
      <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-5 lg:mt-10">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{viewer.name ?? "Signed in"}</p>
          <p className="truncate text-xs text-ink-muted">{viewer.email}</p>
        </div>
        <SignOutButton />
      </div>
    </div>
  );
}
