import { ActivityType, MemberRole } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createOrganizationWithOwner } from "@/lib/services/organizations";
import { resetDatabase, testPrisma } from "../helpers/db";

beforeEach(resetDatabase);
afterAll(async () => {
  await resetDatabase();
  await testPrisma.$disconnect();
});

async function createUser(email: string, name = "Test Person") {
  return testPrisma.user.create({
    data: { name, email, passwordHash: await hashPassword("ProofChain123") },
  });
}

describe("account creation", () => {
  it("stores a verifiable hash rather than the password", async () => {
    const user = await createUser("owner@example.test");

    expect(user.passwordHash).not.toBe("ProofChain123");
    await expect(
      verifyPassword("ProofChain123", user.passwordHash),
    ).resolves.toBe(true);
  });

  it("enforces one account per email address", async () => {
    await createUser("owner@example.test");
    await expect(createUser("owner@example.test")).rejects.toThrow();
  });
});

describe("createOrganizationWithOwner", () => {
  it("installs the creating user as OWNER and records the event", async () => {
    const user = await createUser("owner@example.test", "Faiz Ismail");

    const organization = await testPrisma.$transaction((tx) =>
      createOrganizationWithOwner(tx, {
        organizationName: "FM Global Logistics",
        userId: user.id,
        email: "owner@example.test",
      }),
    );

    const membership = await testPrisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: organization.id,
        },
      },
    });
    expect(membership?.role).toBe(MemberRole.OWNER);

    const refreshed = await testPrisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    expect(refreshed.organizationId).toBe(organization.id);

    const activity = await testPrisma.activityLog.findFirst({
      where: { organizationId: organization.id },
    });
    expect(activity?.type).toBe(ActivityType.ORGANIZATION_CREATED);
  });

  it("allows a user to hold exactly one membership per organization", async () => {
    const user = await createUser("owner@example.test");
    const organization = await testPrisma.$transaction((tx) =>
      createOrganizationWithOwner(tx, {
        organizationName: "FM Global Logistics",
        userId: user.id,
      }),
    );

    await expect(
      testPrisma.membership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: MemberRole.VIEWER,
        },
      }),
    ).rejects.toThrow();
  });

  it("rolls the whole registration back if any step fails", async () => {
    const user = await createUser("owner@example.test");

    await expect(
      testPrisma.$transaction(async (tx) => {
        await createOrganizationWithOwner(tx, {
          organizationName: "Rolled Back Co",
          userId: user.id,
        });
        throw new Error("simulated failure after organization creation");
      }),
    ).rejects.toThrow("simulated failure");

    expect(await testPrisma.organization.count()).toBe(0);
    expect(await testPrisma.membership.count()).toBe(0);
  });
});

describe("organization data isolation", () => {
  it("scopes documents to their own organization", async () => {
    const [userA, userB] = await Promise.all([
      createUser("a@example.test", "Org A Owner"),
      createUser("b@example.test", "Org B Owner"),
    ]);

    const [orgA, orgB] = await testPrisma.$transaction(async (tx) => [
      await createOrganizationWithOwner(tx, {
        organizationName: "Org A",
        userId: userA.id,
      }),
      await createOrganizationWithOwner(tx, {
        organizationName: "Org B",
        userId: userB.id,
      }),
    ]);

    await testPrisma.document.create({
      data: {
        organizationId: orgA.id,
        uploadedBy: userA.id,
        filename: "bill-of-lading.pdf",
        fileSize: 1024,
        mimeType: "application/pdf",
        storagePath: "org-a/bill-of-lading.pdf",
        sha256Hash: "a".repeat(64),
      },
    });

    const visibleToB = await testPrisma.document.findMany({
      where: { organizationId: orgB.id },
    });
    expect(visibleToB).toHaveLength(0);

    const visibleToA = await testPrisma.document.findMany({
      where: { organizationId: orgA.id },
    });
    expect(visibleToA).toHaveLength(1);
  });

  it("rejects the same document hash twice within one organization", async () => {
    const user = await createUser("owner@example.test");
    const organization = await testPrisma.$transaction((tx) =>
      createOrganizationWithOwner(tx, {
        organizationName: "FM Global Logistics",
        userId: user.id,
      }),
    );

    const document = {
      organizationId: organization.id,
      uploadedBy: user.id,
      filename: "invoice.pdf",
      fileSize: 2048,
      mimeType: "application/pdf",
      storagePath: "org/invoice.pdf",
      sha256Hash: "b".repeat(64),
    };

    await testPrisma.document.create({ data: document });
    await expect(
      testPrisma.document.create({
        data: { ...document, filename: "invoice-copy.pdf" },
      }),
    ).rejects.toThrow();
  });
});
