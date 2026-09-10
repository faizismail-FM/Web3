import { MemberRole, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";

const prisma = new PrismaClient();

/**
 * Seeds a single demo organization with one account per role so the
 * role-based access rules can be exercised immediately in development.
 *
 * The password below is a well-known development credential. It exists only to
 * make local setup a one-liner and must never be used outside development.
 */
const DEMO_PASSWORD = "ProofChain123";

const DEMO_USERS = [
  { name: "Faiz Ismail", email: "owner@proofchain.test", role: MemberRole.OWNER },
  { name: "Aisyah Rahman", email: "admin@proofchain.test", role: MemberRole.ADMIN },
  { name: "Daniel Tan", email: "member@proofchain.test", role: MemberRole.MEMBER },
  { name: "Priya Nair", email: "viewer@proofchain.test", role: MemberRole.VIEWER },
];

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed demo accounts in production.");
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const organization = await prisma.organization.upsert({
    where: { id: "seed-organization" },
    update: {},
    create: {
      id: "seed-organization",
      name: "FM Global Logistics",
      registrationNumber: "202301012345",
      email: "operations@fmgloballogistics.test",
    },
  });

  for (const demo of DEMO_USERS) {
    const user = await prisma.user.upsert({
      where: { email: demo.email },
      update: { name: demo.name, organizationId: organization.id },
      create: {
        name: demo.name,
        email: demo.email,
        passwordHash,
        organizationId: organization.id,
      },
    });

    await prisma.membership.upsert({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: organization.id,
        },
      },
      update: { role: demo.role },
      create: {
        userId: user.id,
        organizationId: organization.id,
        role: demo.role,
      },
    });
  }

  console.log(
    `Seeded "${organization.name}" with ${DEMO_USERS.length} accounts (password: ${DEMO_PASSWORD}).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
