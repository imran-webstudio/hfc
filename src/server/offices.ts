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
    },
  });
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
