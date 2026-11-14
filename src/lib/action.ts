export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

/** Expected, user-facing failure (validation, permissions, business rules). */
export class UserError extends Error {}

/** Wraps a server action body: UserErrors become `{ok:false}`; anything else is logged and masked. */
export async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof UserError) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
