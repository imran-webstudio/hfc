import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import { prisma } from "@/lib/prisma";
import { config } from "@/lib/config";

declare module "next-auth" {
  interface Session {
    user: { id: string; name?: string | null; email?: string | null; image?: string | null };
  }
}

/** Promote configured emails (SUPER_ADMIN_EMAILS) to SUPER_ADMIN. */
async function promoteIfConfigured(email?: string | null) {
  if (!email || !config.superAdminEmails.includes(email.toLowerCase())) return;
  await prisma.user.updateMany({
    where: { email: { equals: email, mode: "insensitive" }, role: { not: "SUPER_ADMIN" } },
    data: { role: "SUPER_ADMIN" },
  });
}

const providers = [];
if (config.googleEnabled) {
  providers.push(Google({ allowDangerousEmailAccountLinking: true }));
}
if (config.devLoginEnabled) {
  // Dev-only: "sign in as" any seeded user by email. Disabled unless ENABLE_DEV_LOGIN=true.
  providers.push(
    Credentials({
      id: "dev",
      name: "Dev sign-in",
      credentials: { email: { label: "Email", type: "email" } },
      async authorize(credentials) {
        if (!config.devLoginEnabled) return null;
        const email = String(credentials?.email ?? "").trim();
        if (!email) return null;
        const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
        return user ? { id: user.id, name: user.name, email: user.email, image: user.image } : null;
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as Adapter,
  session: { strategy: "jwt" },
  providers,
  pages: { signIn: "/", error: "/" },
  callbacks: {
    async signIn({ user }) {
      if (user.email) {
        const existing = await prisma.user.findFirst({
          where: { email: { equals: user.email, mode: "insensitive" } },
          select: { banned: true },
        });
        if (existing?.banned) return false;
      }
      return true;
    },
    jwt({ token, user }) {
      if (user?.id) token.uid = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.uid) session.user.id = token.uid as string;
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      await promoteIfConfigured(user.email);
    },
    async createUser({ user }) {
      await promoteIfConfigured(user.email);
    },
  },
});
