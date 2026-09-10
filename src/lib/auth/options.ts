import type { MemberRole } from "@prisma/client";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { rateLimit } from "@/lib/api/rate-limit";
import { verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation/auth";

/**
 * A dummy hash used to keep the failure path of `authorize` roughly constant
 * time. Without it, "unknown email" returns measurably faster than "wrong
 * password", which leaks account existence.
 */
const DUMMY_HASH =
  "$2a$12$C6UzMDM.H6dfI/f/IKcEe.9wJx0V1qHkKqvWl.pJx4L1kGyJZ9Ryu";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        // Throttled per account and per caller. Per account stops one address
        // being ground down; per caller stops a spray across many accounts.
        // Returning null here is indistinguishable from a wrong password, so a
        // throttled attacker learns nothing about which accounts exist.
        const forwarded = request?.headers?.["x-forwarded-for"];
        const ip =
          (Array.isArray(forwarded) ? forwarded[0] : forwarded)
            ?.split(",")[0]
            ?.trim() || "unknown";

        const attempts = [
          rateLimit(`login:email:${parsed.data.email}`, {
            limit: 10,
            windowMs: 15 * 60 * 1000,
          }),
          rateLimit(`login:ip:${ip}`, {
            limit: 30,
            windowMs: 15 * 60 * 1000,
          }),
        ];
        if (attempts.some((attempt) => !attempt.allowed)) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          include: {
            memberships: {
              orderBy: { createdAt: "asc" },
              take: 1,
            },
          },
        });

        const passwordMatches = await verifyPassword(
          parsed.data.password,
          user?.passwordHash ?? DUMMY_HASH,
        );
        if (!user || !passwordMatches) return null;

        const membership = user.memberships[0];

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          organizationId: membership?.organizationId ?? user.organizationId ?? null,
          role: membership?.role ?? null,
          walletAddress: user.walletAddress ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.organizationId = user.organizationId ?? null;
        token.role = user.role ?? null;
        token.walletAddress = user.walletAddress ?? null;
        return token;
      }

      // Profile edits and organization changes must be reflected without
      // forcing the user to sign out and back in.
      if (trigger === "update" && token.id) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.id as string },
          include: {
            memberships: { orderBy: { createdAt: "asc" }, take: 1 },
          },
        });
        if (fresh) {
          const membership = fresh.memberships[0];
          token.name = fresh.name;
          token.email = fresh.email;
          token.organizationId =
            membership?.organizationId ?? fresh.organizationId ?? null;
          token.role = (membership?.role as MemberRole | undefined) ?? null;
          token.walletAddress = fresh.walletAddress ?? null;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.organizationId =
          (token.organizationId as string | null) ?? null;
        session.user.role = (token.role as MemberRole | null) ?? null;
        session.user.walletAddress =
          (token.walletAddress as string | null) ?? null;
      }
      return session;
    },
  },
};
