import Link from "next/link";
import { AccountFigure, SignOutButton } from "@/components/shell/account";
import { Brand } from "@/components/shell/brand";
import { MemberNav } from "@/components/shell/member-nav";
import { requireViewer } from "@/lib/session";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-cream/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5">
          <Brand />
          <MemberNav showAdmin={viewer.isStaff} />
          <div className="flex items-center gap-2.5">
            <Link href="/app/profile" className="hidden sm:block">
              <AccountFigure userId={viewer.id} name={viewer.name ?? "Member"} />
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-40 pt-6">{children}</main>
    </div>
  );
}
