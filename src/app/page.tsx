import Image from "next/image";
import { redirect } from "next/navigation";
import { LogIn, FlaskConical } from "lucide-react";
import { auth } from "@/auth";
import { signInAsDev, signInWithGoogle, signOutAction } from "@/actions/auth";
import { config } from "@/lib/config";
import { getViewer } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const HERO =
  "linear-gradient(125deg, rgba(15,23,20,0.78) 0%, rgba(11,122,106,0.55) 55%, rgba(15,23,20,0.65) 100%), url('https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=2000&q=80')";

const MESSAGES: Record<string, string> = {
  signin: "That account couldn't be signed in.",
  google: "Google sign-in isn't configured on this server.",
  AccessDenied: "This account has been suspended. Please contact your office admin.",
};

export default async function LandingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const viewer = await getViewer();
  if (viewer) redirect("/app");
  const session = await auth();
  const suspended = Boolean(session?.user);

  const devUsers = config.devLoginEnabled
    ? await prisma.user.findMany({
        where: { banned: false, email: { not: null } },
        orderBy: [{ role: "desc" }, { name: "asc" }],
        select: { email: true, name: true, role: true, accountType: true, managedOffices: { select: { officeId: true } } },
        take: 60,
      })
    : [];

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: HERO }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,107,44,0.22),transparent_40%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col justify-end px-6 pb-16 pt-24 text-white md:pb-24">
        <div className="mb-6">
          <Image
            src="/logo.png"
            alt={config.brand}
            width={128}
            height={128}
            priority
            className="h-28 w-28 rounded-full object-contain shadow-[0_12px_40px_rgba(0,0,0,0.35)] md:h-32 md:w-32"
          />
        </div>
        <p className="font-display text-5xl font-extrabold tracking-tight md:text-7xl">{config.brand}</p>
        <h1 className="mt-4 max-w-lg text-xl font-medium text-white/90 md:text-2xl">
          Office lunch, one tap. Biryani, polao, bhat — ordered before cutoff, delivered to your desk.
        </h1>
        <p className="mt-3 max-w-md text-sm text-white/70">
          Cash on delivery or wallet deposit. No payment gateway — just today&apos;s set meal.
        </p>

        {error || suspended ? (
          <p className="mt-5 max-w-md rounded-xl border border-red-400/40 bg-red-500/15 px-4 py-2.5 text-sm text-red-200">
            {suspended ? MESSAGES.AccessDenied : (MESSAGES[error ?? ""] ?? "Sign-in failed. Please try again.")}
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {suspended ? (
            <form action={signOutAction}>
              <button type="submit" className="btn btn-ghost px-6 py-3.5 text-sm">
                Sign out
              </button>
            </form>
          ) : (
            <form action={signInWithGoogle}>
              <button type="submit" className="btn btn-primary px-6 py-3.5 text-sm">
                <LogIn className="h-4 w-4" strokeWidth={2.25} />
                Continue with Google
              </button>
            </form>
          )}
        </div>

        {config.devLoginEnabled && !suspended ? (
          <form action={signInAsDev} className="mt-8 max-w-md rounded-2xl border border-white/15 bg-black/40 p-4 backdrop-blur">
            <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-amber-300">
              <FlaskConical className="h-3.5 w-3.5" /> Dev sign-in (ENABLE_DEV_LOGIN)
            </p>
            <label htmlFor="dev-email" className="field-label">
              Sign in as
            </label>
            <div className="flex gap-2">
              <select id="dev-email" name="email" className="input" defaultValue={devUsers[0]?.email ?? ""}>
                {devUsers.map((u) => (
                  <option key={u.email} value={u.email ?? ""}>
                    {u.name} — {u.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : u.managedOffices.length ? "Manager" : u.accountType === "REGULAR" ? "Member (Regular)" : "Member (One-time)"}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn btn-leaf">
                Sign in
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </main>
  );
}
