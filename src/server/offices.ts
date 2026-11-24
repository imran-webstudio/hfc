import { prisma } from "@/lib/prisma";
import { UserError } from "@/lib/action";
import { isValidHHmm } from "@/lib/time";

export type OfficeScope = string[] | null; // null = all offices

export const officeWhere = (scope: OfficeScope) => (scope ? { id: { in: scope } } : {});

export async function listOffices(opts: { scope?: OfficeScope; activeOnly?: boolean } = {}) {
  return prisma.office.findMany({
    where: { ...officeWhere(opts.scope ?? null), ...(opts.activeOnly ? { active: true } : {}) },
    orderBy: { createdAt: "asc" },
  });
}

export async function listOfficesWithManagers() {
  return prisma.office.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      managers: { include: { user: { select: { id: true, name: true, email: true, role: true, employeeId: true } } } },
      floors: { orderBy: { name: "asc" } },
      companies: { orderBy: { name: "asc" } },
    },
  });
}

// ------------------------------------------------------------- buildings
export async function updateOffice(officeId: string, input: { name: string; address?: string }) {
  const name = input.name.trim();
  if (!name) throw new UserError("Name is required.");
  const clash = await prisma.office.findFirst({ where: { name, id: { not: officeId } } });
  if (clash) throw new UserError("A location with that name already exists.");
  return prisma.office.update({ where: { id: officeId }, data: { name, address: input.address?.trim() || null } });
}

/**
 * Delete a building (spec §11.3): refuse while members are assigned or orders exist,
 * so related customers and historical orders are never destroyed. Floors, managers,
 * day-offs and menu copies of an empty building cascade away with it.
 */
export async function deleteOffice(officeId: string) {
  const [members, orders] = await Promise.all([
    prisma.user.count({ where: { zoneId: officeId } }),
    prisma.order.count({ where: { officeId } }),
  ]);
  if (members > 0) throw new UserError(`Can't delete: ${members} member(s) are assigned to this building. Reassign them first.`);
  if (orders > 0) throw new UserError(`Can't delete: this building has ${orders} historical order(s). Deactivate it instead.`);
  await prisma.office.delete({ where: { id: officeId } });
}

// ------------------------------------------------------------- floors (spec §11.2)
export async function listFloors(officeId?: string) {
  return prisma.floor.findMany({
    where: officeId ? { officeId } : {},
    orderBy: [{ officeId: "asc" }, { name: "asc" }],
  });
}

function cleanFloorName(v: string) {
  const name = v.trim();
  if (!name) throw new UserError("Floor name is required.");
  if (name.length > 40) throw new UserError("Keep the floor name under 40 characters.");
  return name;
}

export async function addFloor(officeId: string, nameRaw: string) {
  const name = cleanFloorName(nameRaw);
  const office = await prisma.office.findUnique({ where: { id: officeId } });
  if (!office) throw new UserError("Building not found.");
  if (await prisma.floor.findUnique({ where: { officeId_name: { officeId, name } } })) {
    throw new UserError("That floor already exists for this building.");
  }
  return prisma.floor.create({ data: { officeId, name } });
}

export async function updateFloor(floorId: string, nameRaw: string) {
  const name = cleanFloorName(nameRaw);
  const floor = await prisma.floor.findUnique({ where: { id: floorId } });
  if (!floor) throw new UserError("Floor not found.");
  const clash = await prisma.floor.findFirst({ where: { officeId: floor.officeId, name, id: { not: floorId } } });
  if (clash) throw new UserError("That floor already exists for this building.");
  return prisma.$transaction(async (tx) => {
    const updated = await tx.floor.update({ where: { id: floorId }, data: { name } });
    // Members store the floor NAME; keep their profiles in sync with the rename.
    if (floor.name !== name) {
      await tx.user.updateMany({ where: { zoneId: floor.officeId, floor: floor.name }, data: { floor: name } });
    }
    return updated;
  });
}

export async function deleteFloor(floorId: string) {
  const floor = await prisma.floor.findUnique({ where: { id: floorId } });
  if (!floor) throw new UserError("Floor not found.");
  const users = await prisma.user.count({ where: { zoneId: floor.officeId, floor: floor.name } });
  if (users > 0) throw new UserError(`Can't delete: ${users} member(s) use this floor. Move them first.`);
  await prisma.floor.delete({ where: { id: floorId } });
}

// ------------------------------------------------------------- companies
// Predefined by admins per building, exactly like floors: members pick one in
// Profile and User.company stores the name.
export async function listCompanies(officeId?: string) {
  return prisma.company.findMany({
    where: officeId ? { officeId } : {},
    orderBy: [{ officeId: "asc" }, { name: "asc" }],
  });
}

function cleanCompanyName(v: string) {
  const name = v.trim().replace(/\s+/g, " ");
  if (!name) throw new UserError("Company name is required.");
  if (name.length > 60) throw new UserError("Keep the company name under 60 characters.");
  return name;
}

export async function addCompany(officeId: string, nameRaw: string) {
  const name = cleanCompanyName(nameRaw);
  const office = await prisma.office.findUnique({ where: { id: officeId } });
  if (!office) throw new UserError("Building not found.");
  if (await prisma.company.findUnique({ where: { officeId_name: { officeId, name } } })) {
    throw new UserError("That company already exists for this building.");
  }
  return prisma.company.create({ data: { officeId, name } });
}

export async function deleteCompany(companyId: string) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new UserError("Company not found.");
  const users = await prisma.user.count({ where: { zoneId: company.officeId, company: company.name } });
  if (users > 0) throw new UserError(`Can't delete: ${users} member(s) use this company. Move them first.`);
  await prisma.company.delete({ where: { id: companyId } });
}

function cleanTime(v: string, label: string) {
  const t = v.trim();
  if (!isValidHHmm(t)) throw new UserError(`${label} must be 24-hour time like 13:00.`);
  return t;
}

export async function createOffice(input: { name: string; address?: string; cutoff: string }) {
  const name = input.name.trim();
  if (!name) throw new UserError("Name is required.");
  const lunchCutoff = cleanTime(input.cutoff, "Order cutoff");
  if (await prisma.office.findUnique({ where: { name } })) throw new UserError("A location with that name already exists.");
  return prisma.office.create({ data: { name, address: input.address?.trim() || null, lunchCutoff } });
}

export async function setOfficeActive(officeId: string, active: boolean) {
  await prisma.office.update({ where: { id: officeId }, data: { active } });
}

export async function setLunchCutoff(officeId: string, cutoff: string) {
  await prisma.office.update({ where: { id: officeId }, data: { lunchCutoff: cleanTime(cutoff, "Lunch cutoff") } });
}

/** Set cutoffs for one office, or for every active office when officeId is null. */
export async function setCutoffs(officeIds: string[], lunch: string, dinner: string) {
  const lunchCutoff = cleanTime(lunch, "Lunch cutoff");
  const dinnerCutoff = cleanTime(dinner, "Dinner cutoff");
  await prisma.office.updateMany({ where: { id: { in: officeIds } }, data: { lunchCutoff, dinnerCutoff } });
}

export async function setOfferDinner(officeIds: string[], offerDinner: boolean) {
  await prisma.office.updateMany({ where: { id: { in: officeIds } }, data: { offerDinner } });
}

export async function addManager(officeId: string, userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new UserError("Member not found.");
  if (user.banned) throw new UserError("That member is banned.");
  await prisma.officeManager.upsert({
    where: { officeId_userId: { officeId, userId } },
    create: { officeId, userId },
    update: {},
  });
}

export async function removeManager(officeId: string, userId: string) {
  await prisma.officeManager.deleteMany({ where: { officeId, userId } });
}

export async function managerCandidates(officeId: string, q: string) {
  const term = q.trim();
  const assigned = await prisma.officeManager.findMany({ where: { officeId }, select: { userId: true } });
  return prisma.user.findMany({
    where: {
      banned: false,
      id: { notIn: assigned.map((a) => a.userId) },
      ...(term
        ? {
            OR: [
              { name: { contains: term, mode: "insensitive" } },
              { email: { contains: term, mode: "insensitive" } },
              { employeeId: { contains: term, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    take: 25,
    select: { id: true, name: true, email: true, employeeId: true },
  });
}
