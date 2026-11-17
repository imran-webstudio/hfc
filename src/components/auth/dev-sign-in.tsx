"use client";

import { useState } from "react";
import { signInAsDev } from "@/actions/auth";

type DevUser = { email: string; label: string };

/** Existing dev-only email sign-in. Closed state matches the quiet secondary link. */
export function DevSignIn({ users }: { users: DevUser[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-7">
      <div className="flex items-center gap-4 text-sm text-ink-muted">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>
      {open ? (
        <form action={signInAsDev} className="mt-4">
          <label htmlFor="dev-email" className="field-label text-xs font-medium text-ink-muted">
            Sign in as
          </label>
          <select id="dev-email" name="email" className="input text-sm" defaultValue={users[0]?.email ?? ""}>
            {users.map((u) => (
              <option key={u.email} value={u.email}>
                {u.label}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-ghost btn-sm mt-2 w-full">
            Sign in
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 w-full text-center text-[15px] text-ink-muted underline decoration-ink-muted/40 underline-offset-4"
        >
          Use phone or email instead
        </button>
      )}
    </div>
  );
}
