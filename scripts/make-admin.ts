/**
 * Promote (or demote) a user to SUPER_ADMIN.
 *
 *   npm run make-admin -- you@example.com            # promote (creates the row if the user hasn't signed in yet)
 *   npm run make-admin -- you@example.com --demote   # back to USER
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [email, flag] = process.argv.slice(2);
  if (!email) {
    console.error("Usage: npm run make-admin -- <email> [--demote]");
    process.exit(1);
  }
  const role = flag === "--demote" ? "USER" : "SUPER_ADMIN";
  const existing = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data: { role } });
  } else if (role === "SUPER_ADMIN") {
    // Pre-create so the account is already SUPER_ADMIN on first Google sign-in (adapter links by email).
    await prisma.user.create({ data: { email, name: email.split("@")[0], role } });
  } else {
    console.error(`No user with email ${email}`);
    process.exit(1);
  }
  console.log(`${email} is now ${role}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
