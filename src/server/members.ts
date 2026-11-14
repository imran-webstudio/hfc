import type { AccountType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { UserError } from "@/lib/action";
import { sortFloors } from "@/lib/floors";
import type { Viewer } from "@/lib/session";
import { officeScope } from "@/lib/session";
import type { OfficeScope } from "@/server/offices";

/** Members visible to a viewer: everyone for super admins; own offices (+ unassigned) for managers. */
export function memberScopeWhere(scope: OfficeScope): Prisma.UserWhereInput {
  return scope ? { OR: [{ zoneId: { in: scope } }, { zoneId: null }] } : {};
}

export type MemberFilters = { zone?: string; floor?: string; q?: string };

export function memberWhere(scope: OfficeScope, f: MemberFilters): Prisma.UserWhereInput {
  const and: Prisma.UserWhereInput[] = [memberScopeWhere(scope)];
  if (f.zone === "none") and.push({ zoneId: null });
  else if (f.zone && f.zone !== "all") and.push({ zoneId: f.zone });
  if (f.floor && f.floor !== "all") and.push({ floor: f.floor });
  const q = f.q?.trim();
  if (q) {
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { employeeId: { contains: q, mode: "insensitive" } },
        { desk: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  return { AND: and };
}

export async function listMembers(scope: OfficeScope, f: MemberFilters) {
  return prisma.user.findMany({
    where: memberWhere(scope, f),
    orderBy: [{ role: "desc" }, { name: "asc" }],
    include: { zone: { select: { id: true, name: true } } },
  });
}

export async function memberFloors(scope: OfficeScope) {
  const rows = await prisma.user.findMany({
    where: { AND: [memberScopeWhere(scope), { floor: { not: null } }] },
    select: { floor: true },
    distinct: ["floor"],
  });
  return sortFloors(rows.map((r) => r.floor ?? ""));
}

/** Throws unless the actor may manage this member. */
export async function assertMemberAccess(actor: Viewer, memberId: string) {
  const member = await prisma.user.findUnique({ where: { id: memberId } });
  if (!member) throw new UserError("Member not found.");
  const scope = officeScope(actor);
  if (scope && member.zoneId && !scope.includes(member.zoneId)) throw new UserError("That member belongs to another location.");
  return member;
}

export async function setAccountType(actor: Viewer, memberId: string, type: AccountType) {
  await assertMemberAccess(actor, memberId);
  await prisma.user.update({ where: { id: memberId }, data: { accountType: type } });
}

export async function setZone(actor: Viewer, memberId: string, zoneId: string | null) {
  await assertMemberAccess(actor, memberId);
  const scope = officeScope(actor);
  if (zoneId) {
    const office = await prisma.office.findUnique({ where: { id: zoneId } });
    if (!office) throw new UserError("Location not found.");
    if (scope && !scope.includes(zoneId)) throw new UserError("You can't assign that location.");
  } else if (scope) {
    throw new UserError("Only a super admin can unassign a zone.");
  }
  await prisma.user.update({ where: { id: memberId }, data: { zoneId } });
}

export async function setBanned(actor: Viewer, memberId: string, banned: boolean) {
  const member = await assertMemberAccess(actor, memberId);
  if (member.role === "SUPER_ADMIN") throw new UserError("Super admins can't be banned.");
  if (member.id === actor.id) throw new UserError("You can't ban yourself.");
  await prisma.user.update({ where: { id: memberId }, data: { banned } });
  if (banned) await prisma.session.deleteMany({ where: { userId: memberId } });
}

export async function deleteMember(actor: Viewer, memberId: string) {
  const member = await assertMemberAccess(actor, memberId);
  if (member.role === "SUPER_ADMIN") throw new UserError("Super admins can't be deleted.");
  if (member.id === actor.id) throw new UserError("You can't delete yourself.");
  await prisma.user.delete({ where: { id: memberId } });
}

export async function updatePhone(actor: Viewer, memberId: string, phone: string) {
  await assertMemberAccess(actor, memberId);
  const p = phone.trim();
  if (p && !/^[0-9+\-\s()]{6,20}$/.test(p)) throw new UserError("Enter a valid phone number.");
  await prisma.user.update({ where: { id: memberId }, data: { phone: p || null } });
}

export type ProfileInput = {
  employeeId: string;
  phone: string;
  officeId: string;
  floor: string;
  desk: string;
  address: string;
};

export async function updateOwnProfile(userId: string, input: ProfileInput) {
  const fields = {
    employeeId: input.employeeId.trim(),
    phone: input.phone.trim(),
    floor: input.floor.trim(),
    desk: input.desk.trim(),
    address: input.address.trim(),
  };
  if (Object.values(fields).some((v) => !v) || !input.officeId) throw new UserError("Please fill in every field.");
  if (!/^[0-9+\-\s()]{6,20}$/.test(fields.phone)) throw new UserError("Enter a valid phone number.");
  const office = await prisma.office.findUnique({ where: { id: input.officeId } });
  if (!office || !office.active) throw new UserError("Choose a valid office.");
  await prisma.user.update({
    where: { id: userId },
    data: { ...fields, building: office.name, zoneId: office.id },
  });
}

/** Quick typeahead for the phone-order form. */
export async function searchMembers(actor: Viewer, q: string, officeId?: string) {
  const term = q.trim();
  const scope = officeScope(actor);
  return prisma.user.findMany({
    where: {
      AND: [
        { banned: false },
        memberScopeWhere(scope),
        officeId ? { OR: [{ zoneId: officeId }, { zoneId: null }] } : {},
        term
          ? {
              OR: [
                { name: { contains: term, mode: "insensitive" } },
                { email: { contains: term, mode: "insensitive" } },
                { employeeId: { contains: term, mode: "insensitive" } },
                { desk: { contains: term, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    },
    orderBy: { name: "asc" },
    take: 12,
    select: { id: true, name: true, employeeId: true, floor: true, desk: true, accountType: true },
  });
}
