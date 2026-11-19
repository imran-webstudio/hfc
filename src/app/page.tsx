import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { signInWithGoogle, signOutAction } from "@/actions/auth";
import { DevSignIn } from "@/components/auth/dev-sign-in";
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
  const kind = u.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : u.managedOffices.length ? "Manager" : "Member";
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
        select: { email: true, name: true, role: true, managedOffices: { select: { officeId: true } } },
        take: 60,
      })
    : [];

  const devOptions = devUsers.flatMap((u) => (u.email ? [{ email: u.email, label: devLabel(u) }] : []));

  const message = suspended
    ? MESSAGES.AccessDenied
    : error
      ? (MESSAGES[error] ?? "Sign-in failed. Please try again.")
      : null;

  if (suspended) {
    const person = session?.user?.id
      ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, employeeId: true } })
      : null;
    return (
      <main className="relative flex min-h-dvh flex-col px-5 py-5">
        <header className="flex items-start justify-between">
          <div>
            <p className="text-2xl font-bold tracking-tight">HFC</p>
            <p className="text-sm text-ink-muted">Home Flavour Catering <span className="text-[#5B4CF5]">•</span></p>
          </div>
          <ThemeToggle />
        </header>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center text-center">
          <div className="grid h-36 w-36 place-items-center rounded-[2rem] bg-white shadow-sm">
            <svg viewBox="0 0 48 48" className="h-16 w-16 text-[#5B4CF5]" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
              <rect x="12" y="22" width="24" height="18" rx="4" />
              <path d="M18 22v-6a6 6 0 0 1 12 0v6" />
              <circle cx="24" cy="31" r="2" fill="currentColor" />
            </svg>
          </div>
          <h1 className="mt-8 text-4xl font-semibold tracking-tight">Account blocked</h1>
          <p className="mt-3 max-w-sm text-ink-muted">You can&apos;t sign in or place orders right now. Contact your office catering manager to restore access.</p>
          <p role="alert" className="sr-only">{message}</p>
          {person ? (
            <div className="mt-6 flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left shadow-sm">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#ECECEF] text-sm font-bold">{(person.name ?? "?").slice(0, 1)}</span>
              <span>
                <span className="block font-semibold">{person.name ?? "Member"}</span>
                <span className="block text-sm text-ink-muted">{person.employeeId ? `ID ${person.employeeId}` : "Office account"}</span>
              </span>
            </div>
          ) : null}
          <a href="mailto:?subject=Restore%20my%20Home%20Flavour%20account" className="btn mt-6 h-12 w-full rounded-full bg-[#D4FF3A] text-[#0B0B0F]">
            Contact catering team
          </a>
          <form action={signOutAction} className="mt-4 w-full">
            <button type="submit" className="btn btn-text w-full">
              Back to sign in
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-dvh flex-col">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-20 h-80 w-80 rounded-full bg-[#5B4CF5]/35 blur-3xl dark:bg-[#5B4CF5]/25 lg:hidden" />
      <div aria-hidden className="pointer-events-none absolute -left-24 top-[38%] h-72 w-72 rounded-full bg-[#D4FF3A]/50 blur-3xl dark:bg-[#D4FF3A]/15 lg:hidden" />
      <div aria-hidden className="pointer-events-none absolute -bottom-16 right-[-10%] h-64 w-64 rounded-full bg-[#14b8a6]/30 blur-3xl dark:bg-[#14b8a6]/15 lg:hidden" />
      <div
        aria-hidden
        className="pointer-events-none absolute left-[-8%] top-[18%] hidden h-[26rem] w-[26rem] rounded-full bg-[#5B4CF5]/30 blur-[110px] dark:bg-[#5B4CF5]/35 lg:block"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[6%] left-[12%] hidden h-[22rem] w-[22rem] rounded-full bg-[#D4FF3A]/35 blur-[110px] dark:bg-[#C6F020]/20 lg:block"
      />

      <header className="relative flex items-center justify-between px-5 pt-5 sm:px-8 sm:pt-7">
        <p className="text-[1.65rem] font-bold tracking-tight text-ink">hfc</p>
        <ThemeToggle />
      </header>

      <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 sm:px-10 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,26rem)] lg:items-center lg:gap-20 lg:px-16">
        <section className="pt-14 lg:pt-0">
          <div className="lg:hidden">
            <h1 className="text-[2.65rem] font-bold leading-[1.05] tracking-tight text-ink">Welcome back</h1>
            <p className="mt-3 text-lg text-ink-muted">Sign in to order your meals</p>
          </div>
          <div className="hidden max-w-xl lg:block">
            <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight text-ink xl:text-[3.4rem]">
              Lunch and dinner, sorted.
            </h1>
            <p className="mt-5 max-w-md text-lg text-ink-muted">Order before the cutoff. We handle the rest.</p>
          </div>
        </section>

        <section className="flex flex-1 flex-col justify-center py-10 lg:flex-none lg:justify-self-end lg:rounded-[1.75rem] lg:border lg:border-line lg:bg-rice lg:px-8 lg:py-9 lg:shadow-[var(--hfc-card-shadow)]">
          <div className="mb-6 hidden lg:block">
            <h2 className="text-[1.65rem] font-semibold tracking-tight text-ink">Sign in</h2>
            <p className="mt-1.5 text-[15px] text-ink-muted">Welcome back to hfc</p>
          </div>

          {message ? (
            <p role="alert" className="mb-5 rounded-2xl border border-[#e03131]/30 bg-[#e03131]/10 px-4 py-3 text-sm leading-relaxed text-[#c92a2a] dark:text-[#ffb4b4]">
              {message}
            </p>
          ) : null}

          {suspended ? (
            <form action={signOutAction}>
              <button type="submit" className="btn btn-primary w-full">
                Sign out
              </button>
            </form>
          ) : (
            <form action={signInWithGoogle}>
              <button type="submit" className="btn-google">
                <GoogleMark />
                Continue with Google
              </button>
            </form>
          )}

          {config.devLoginEnabled && !suspended && devOptions.length > 0 ? <DevSignIn users={devOptions} /> : null}
        </section>
      </div>

      <p className="relative px-6 pb-8 text-center text-[15px] text-ink-muted lg:hidden">New here? Ask your office admin for access</p>
    </main>
  );
}
