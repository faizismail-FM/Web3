import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { DocumentType, RegistrationStatus } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { hashPassword } from "@/lib/auth/password";
import { createDocumentFromUpload } from "@/lib/services/documents";
import { createOrganizationWithOwner } from "@/lib/services/organizations";
import { registerDocumentProof } from "@/lib/services/registrations";
import { resetDatabase, testPrisma } from "../helpers/db";

let storageDir: string;

beforeAll(async () => {
  storageDir = await mkdtemp(path.join(tmpdir(), "proofchain-errors-"));
  process.env.STORAGE_DIR = storageDir;
  process.env.BLOCKCHAIN_MODE = "mock";
});

afterAll(async () => {
  await rm(storageDir, { recursive: true, force: true });
  await resetDatabase();
  await testPrisma.$disconnect();
});

beforeEach(resetDatabase);

async function seedDocument() {
  const user = await testPrisma.user.create({
    data: {
      name: "Faiz Ismail",
      email: `${crypto.randomUUID()}@example.test`,
      passwordHash: await hashPassword("ProofChain123"),
    },
  });
  const organization = await testPrisma.$transaction((tx) =>
    createOrganizationWithOwner(tx, {
      organizationName: "FM Global Logistics",
      userId: user.id,
    }),
  );
  const document = await createDocumentFromUpload({
    organizationId: organization.id,
    userId: user.id,
    file: new File(["%PDF-1.7 body"], "bill.pdf", { type: "application/pdf" }),
    documentType: DocumentType.BILL_OF_LADING,
  });
  return { user, organization, document };
}

describe("stored failure messages", () => {
  it("never persists internal error text for display", async () => {
    const { user, organization, document } = await seedDocument();

    // A provider failure whose message carries internals a user must not see.
    const leaky =
      "connect ECONNREFUSED 10.0.0.5:5432 (postgresql://admin:hunter2@db/proofchain)";
    const provider = await import("@/lib/blockchain/provider");
    const spy = vi
      .spyOn(provider, "getBlockchainProvider")
      .mockReturnValue({
        mode: "MOCK",
        anchor: async () => {
          throw new Error(leaky);
        },
      } as never);

    await expect(
      registerDocumentProof({
        documentId: document.id,
        organizationId: organization.id,
        userId: user.id,
      }),
    ).rejects.toThrow();

    spy.mockRestore();

    const registration = await testPrisma.blockchainRegistration.findFirstOrThrow(
      { where: { documentId: document.id } },
    );

    expect(registration.status).toBe(RegistrationStatus.FAILED);
    expect(registration.errorMessage).not.toContain("ECONNREFUSED");
    expect(registration.errorMessage).not.toContain("hunter2");
    expect(registration.errorMessage).not.toContain("postgresql://");
    expect(registration.errorMessage).toBe(
      "The blockchain proof could not be created.",
    );
  });

  it("does not put internal detail in the activity log either", async () => {
    const { user, organization, document } = await seedDocument();

    const provider = await import("@/lib/blockchain/provider");
    const spy = vi.spyOn(provider, "getBlockchainProvider").mockReturnValue({
      mode: "MOCK",
      anchor: async () => {
        throw new Error("secret-internal-detail-42");
      },
    } as never);

    await expect(
      registerDocumentProof({
        documentId: document.id,
        organizationId: organization.id,
        userId: user.id,
      }),
    ).rejects.toThrow();

    spy.mockRestore();

    const entries = await testPrisma.activityLog.findMany({
      where: { documentId: document.id },
    });
    expect(JSON.stringify(entries)).not.toContain("secret-internal-detail-42");
  });
});
