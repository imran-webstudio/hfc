import { cache } from "react";
import { redirect } from "next/navigation";
import type { Office, User } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { UserError } from "@/lib/action";

export type Viewer = User & {
  zone: Office | null;
  managedOfficeIds: string[];
  isSuperAdmin: boolean;
  /** SUPER_ADMIN or manager of at least one office */
  isStaff: boolean;
};

/**
 * A member's profile counts as set up only when every field the profile form
 * requires is present (updateOwnProfile enforces the same all-fields rule).
 * First-time sign-ins (e.g. a fresh Google account) have none of them.
 */
export function profileComplete(v: Pick<User, "employeeId" | "phone" | "zoneId" | "floor" | "company" | "address">): boolean {
  return Boolean(v.employeeId && v.phone && v.zoneId && v.floor && v.company && v.address);
}

/** Current signed-in, non-banned user (cached per request) or null. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await prisma.user.findUnique({
    where: { id },
    include: { zone: true, managedOffices: { select: { officeId: true } } },
  });
  if (!user || user.banned) return null;
  const { managedOffices, ...rest } = user;
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  return {
    ...rest,
    managedOfficeIds: managedOffices.map((m) => m.officeId),
    isSuperAdmin,
    isStaff: isSuperAdmin || managedOffices.length > 0,
  };
});

/** For pages/layouts: redirect to the landing page when signed out. */
export async function requireViewer(): Promise<Viewer> {
  const v = await getViewer();
  if (!v) redirect("/");
  return v;
}

/** For pages/layouts under /admin: SUPER_ADMIN or office manager. */
export async function requireStaff(): Promise<Viewer> {
  const v = await requireViewer();
  if (!v.isStaff) redirect("/app");
  return v;
}

export async function requireSuperAdminPage(): Promise<Viewer> {
  const v = await requireStaff();
  if (!v.isSuperAdmin) redirect("/admin");
  return v;
}

/** For server actions: throw instead of redirecting. */
export async function assertViewer(): Promise<Viewer> {
  const v = await getViewer();
  if (!v) throw new UserError("Please sign in again.");
  return v;
}

export async function assertStaff(): Promise<Viewer> {
  const v = await assertViewer();
  if (!v.isStaff) throw new UserError("You don't have permission to do that.");
  return v;
}

export async function assertSuperAdmin(): Promise<Viewer> {
  const v = await assertViewer();
  if (!v.isSuperAdmin) throw new UserError("Only a super admin can do that.");
  return v;
}

/** Office ids the viewer may manage; null = every office. */
export function officeScope(v: Viewer): string[] | null {
  return v.isSuperAdmin ? null : v.managedOfficeIds;
}

export function canManageOffice(v: Viewer, officeId: string | null | undefined): boolean {
  if (v.isSuperAdmin) return true;
  return !!officeId && v.managedOfficeIds.includes(officeId);
}
