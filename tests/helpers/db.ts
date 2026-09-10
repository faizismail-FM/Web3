import { PrismaClient } from "@prisma/client";

export const testPrisma = new PrismaClient();

/**
 * Removes all rows between tests. Ordered so that foreign keys are satisfied
 * without relying on cascade behaviour, which is itself under test elsewhere.
 */
export async function resetDatabase() {
  await testPrisma.activityLog.deleteMany();
  await testPrisma.verification.deleteMany();
  await testPrisma.blockchainRegistration.deleteMany();
  await testPrisma.document.deleteMany();
  await testPrisma.membership.deleteMany();
  await testPrisma.user.deleteMany();
  await testPrisma.organization.deleteMany();
}
