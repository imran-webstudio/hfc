import { User } from "lucide-react";
import { ProfileForm } from "@/components/member/profile-form";
import { PageTitle } from "@/components/ui/ui";
import { requireViewer } from "@/lib/session";
import { listOffices } from "@/server/offices";

export const metadata = { title: "Your profile" };

export default async function ProfilePage() {
  const viewer = await requireViewer();
  const offices = await listOffices({ activeOnly: true });
  return (
    <div className="mx-auto max-w-lg">
      <PageTitle icon={<User className="h-5 w-5" />} title="Your profile">
        Update desk, building, floor, office address, or phone. Your catering zone follows the office you select (admins can still change it).
      </PageTitle>
      <ProfileForm
        offices={offices.map((o) => ({ id: o.id, name: o.name }))}
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
    </div>
  );
}
