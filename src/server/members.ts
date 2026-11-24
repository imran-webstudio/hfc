import type { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { UserError } from "@/lib/action";
import { sortFloors } from "@/lib/floors";
import type { Viewer } from "@/lib/session";
import { officeScope } from "@/lib/session";
import { writeAudit } from "@/server/audit";
import type { OfficeScope } from "@/server/offices";

/** Members visible to a viewer: everyone for super admins; own offices (+ unassigned) for managers. */
export function memberScopeWhere(scope: OfficeScope): Prisma.UserWhereInput {
  return scope ? { OR: [{ zoneId: { in: scope } }, { zoneId: null }] } : {};
}

export type MemberFilters = { zone?: string; floor?: string; q?: string; balance?: string };

export function memberWhere(scope: OfficeScope, f: MemberFilters): Prisma.UserWhereInput {
  const and: Prisma.UserWhereInput[] = [memberScopeWhere(scope)];
  if (f.zone === "none") and.push({ zoneId: null });
  else if (f.zone && f.zone !== "all") and.push({ zoneId: f.zone });
  if (f.floor && f.floor !== "all") and.push({ floor: f.floor });
  // Balance = Total Deposit − Total Bill: negative means the member owes (due),
  // positive means the house owes them (credit). Zero is neither.
  if (f.balance === "due") and.push({ balance: { lt: 0 } });
  else if (f.balance === "credit") and.push({ balance: { gt: 0 } });
  else if (f.balance === "zero") and.push({ balance: 0 });
  const q = f.q?.trim();
  if (q) {
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { employeeId: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
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

/**
 * Floor filter options come from the Floor registry (spec §11.3): when a building is
 * selected, only that building's floors; otherwise every registered floor in scope.
 * Falls back to members' free-text floors only when the registry is empty (pre-P0 data).
 */
export async function memberFloors(scope: OfficeScope, officeId?: string) {
  const registry = await prisma.floor.findMany({
    where: {
      ...(officeId && officeId !== "all" ? { officeId } : scope ? { officeId: { in: scope } } : {}),
    },
    select: { name: true },
    distinct: ["name"],
  });
  if (registry.length) return sortFloors(registry.map((r) => r.name));
  const rows = await prisma.user.findMany({
    where: {
      AND: [memberScopeWhere(scope), officeId && officeId !== "all" ? { zoneId: officeId } : {}, { floor: { not: null } }],
    },
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

/**
 * Change a member's role (Member <-> Admin). Super admins only.
 * Guards: you cannot change your own role, and the last remaining
 * admin cannot be demoted — the panel must always keep an admin.
 */
export async function setRole(actor: Viewer, memberId: string, role: Role) {
  if (!actor.isSuperAdmin) throw new UserError("Only an admin can change roles.");
  if (actor.id === memberId) throw new UserError("You can't change your own role.");
  const member = await prisma.user.findUnique({ where: { id: memberId }, select: { role: true } });
  if (!member) throw new UserError("Member not found.");
  if (member.role === "SUPER_ADMIN" && role === "USER") {
    const admins = await prisma.user.count({ where: { role: "SUPER_ADMIN", banned: false } });
    if (admins <= 1) throw new UserError("There must be at least one admin.");
  }
  await prisma.user.update({ where: { id: memberId }, data: { role } });
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
  // Floors are a dynamic registry per building (spec §11): when the building has
  // registered floors, the profile floor must be one of them.
  const registered = await prisma.floor.findMany({ where: { officeId: office.id }, select: { name: true } });
  if (registered.length && !registered.some((f) => f.name === fields.floor)) {
    throw new UserError("Choose a floor from this building's floor list.");
  }
  await prisma.user.update({
    where: { id: userId },
    data: { ...fields, building: office.name, zoneId: office.id },
  });
}

/**
 * Clear Order History — complete account reset (spec §8.3). One atomic transaction:
 * deletes the member's orders (items cascade) and ALL ledger entries, and leaves the
 * balance at exactly ৳0. Profile and login are untouched. Only allowed when the current
 * balance is exactly ৳0, so no money silently vanishes. The reset itself is written to
 * the staff AuditLog, which is not part of the member's history and survives the wipe.
 */
export async function clearMemberHistory(actor: Viewer, memberId: string) {
  await assertMemberAccess(actor, memberId);
  return prisma.$transaction(async (tx) => {
    const member = await tx.user.findUnique({ where: { id: memberId }, select: { balance: true, name: true } });
    if (!member) throw new UserError("Member not found.");
    if (member.balance !== 0) {
      throw new UserError(`Clear Order History needs a balance of exactly ৳0 — this member's balance is ৳${member.balance}. Settle or adjust it first.`);
    }
    const orders = await tx.order.count({ where: { userId: memberId } });
    const ledger = await tx.ledgerEntry.count({ where: { userId: memberId } });
    await tx.order.deleteMany({ where: { userId: memberId } });
    await tx.ledgerEntry.deleteMany({ where: { userId: memberId } });
    await tx.user.update({ where: { id: memberId }, data: { balance: 0 } });
    await writeAudit(tx, {
      actorId: actor.id,
      memberId,
      action: "CLEAR_HISTORY",
      detail: `Cleared ${orders} order(s) and ${ledger} ledger entr(ies) for ${member.name ?? "member"}`,
      amount: 0,
    });
    return { orders, ledger };
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
    select: { id: true, name: true, employeeId: true, floor: true, desk: true, zoneId: true },
  });
}
