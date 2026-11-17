import Image from "next/image";
import { redirect } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { auth } from "@/auth";
import { signInAsDev, signInWithGoogle, signOutAction } from "@/actions/auth";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { config } from "@/lib/config";
import { getViewer } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const MESSAGES: Record<string, string> = {
  signin: "That account couldn't be signed in.",
  google: "Google sign-in isn't configured on this server.",
  AccessDenied: "This account has been suspended. Please contact your office admin.",
};

type DevUser = {
  email: string | null;
  name: string | null;
  role: string;
  accountType: string;
  managedOffices: { officeId: string }[];
};

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-6 w-6 shrink-0" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function devLabel(u: DevUser) {
  const kind =
    u.role === "SUPER_ADMIN"
      ? "SUPER_ADMIN"
      : u.managedOffices.length
        ? "Manager"
        : u.accountType === "REGULAR"
          ? "Member (Regular)"
          : "Member (One-time)";
  return `${u.name} — ${kind}`;
}

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

  const message = suspended
    ? MESSAGES.AccessDenied
    : error
      ? (MESSAGES[error] ?? "Sign-in failed. Please try again.")
      : null;

  return (
    <main className="relative flex min-h-dvh flex-col">
      <header className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-8 sm:pt-6">
        <p className="text-sm font-semibold tracking-tight text-ink lg:hidden">HFC</p>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 items-center px-4 py-6 sm:px-8 sm:py-10">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(22rem,26rem)] lg:gap-20">
          <section className="max-w-xl">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt=""
                width={64}
                height={64}
                priority
                className="h-14 w-14 rounded-2xl bg-white object-contain p-1 shadow-[0_8px_24px_rgba(11,11,15,0.08)] ring-1 ring-black/5"
              />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#5B4CF5] dark:text-[#D4FF3A]">HFC</p>
                <p className="text-sm font-medium text-ink-muted">{config.brand}</p>
              </div>
            </div>
            <h1 className="mt-6 text-[2rem] font-semibold leading-[1.1] tracking-tight text-ink sm:text-5xl lg:text-[3.25rem]">
              Office lunch, one tap.
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-ink-muted sm:text-lg">
              Biryani, polao, bhat — ordered before cutoff, delivered to your desk.
            </p>
            <ul className="mt-6 hidden max-w-md gap-2.5 text-sm text-ink sm:grid">
              <li className="flex items-center gap-2.5">
                <span className="h-2 w-2 shrink-0 rounded-full bg-[#5B4CF5]" />
                Cash on delivery or wallet deposit
              </li>
              <li className="flex items-center gap-2.5">
                <span className="h-2 w-2 shrink-0 rounded-full bg-[#D4FF3A] ring-1 ring-black/10" />
                No payment gateway — just today&apos;s set meal
              </li>
              <li className="flex items-center gap-2.5">
                <span className="h-2 w-2 shrink-0 rounded-full bg-[#0F9B8E]" />
                Lunch and dinner cutoffs, per office
              </li>
            </ul>
          </section>

          <section className="surface-card w-full justify-self-center rounded-[1.75rem] p-6 sm:p-8 lg:justify-self-end">
            <h2 className="text-xl font-semibold tracking-tight text-ink">{suspended ? "Account suspended" : "Sign in"}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
              {suspended ? "This office account can’t place orders until an admin restores it." : "Use the Google account your office already knows."}
            </p>

            {message ? (
              <p role="alert" className="mt-5 rounded-2xl border border-[#e03131]/30 bg-[#e03131]/10 px-4 py-3 text-sm leading-relaxed text-[#c92a2a] dark:text-[#ffb4b4]">
                {message}
              </p>
            ) : null}

            {suspended ? (
              <form action={signOutAction} className="mt-6">
                <button type="submit" className="btn btn-primary w-full">
                  Sign out
                </button>
              </form>
            ) : (
              <form action={signInWithGoogle} className="mt-6">
                <button type="submit" className="btn-google">
                  <GoogleMark />
                  Continue with Google
                </button>
              </form>
            )}

            {config.devLoginEnabled && !suspended ? (
              <form action={signInAsDev} className="mt-5">
                <div className="mb-4 flex items-center gap-3 text-[11px] font-medium uppercase tracking-wider text-ink-muted">
                  <span className="h-px flex-1 bg-line" />
                  or
                  <span className="h-px flex-1 bg-line" />
                </div>
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-ink-muted">
                  <FlaskConical className="h-3 w-3" /> Dev sign-in
                </p>
                <label htmlFor="dev-email" className="field-label text-xs font-medium text-ink-muted">
                  Sign in as
                </label>
                <select id="dev-email" name="email" className="input text-xs" defaultValue={devUsers[0]?.email ?? ""}>
                  {devUsers.map((u) => (
                    <option key={u.email} value={u.email ?? ""}>
                      {devLabel(u)}
                    </option>
                  ))}
                </select>
                <button type="submit" className="btn btn-ghost btn-sm mt-2 w-full">
                  Sign in
                </button>
              </form>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
