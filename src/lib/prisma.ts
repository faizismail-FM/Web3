import { PrismaClient } from "@prisma/client";

/**
 * A single PrismaClient instance is reused across hot reloads in development;
 * without this Next.js would open a new connection pool on every rebuild.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
