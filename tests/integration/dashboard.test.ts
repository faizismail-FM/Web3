import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { ActivityType, DocumentStatus, DocumentType } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { hashPassword } from "@/lib/auth/password";
import { recordActivity } from "@/lib/services/activity";
import { listActivity } from "@/lib/services/activity";
import {
  getBlockchainStatus,
  getDashboardStats,
  getRecentActivity,
} from "@/lib/services/dashboard";
import { createDocumentFromUpload } from "@/lib/services/documents";
import { createOrganizationWithOwner } from "@/lib/services/organizations";
import { registerDocumentProof } from "@/lib/services/registrations";
import { resetDatabase, testPrisma } from "../helpers/db";

let storageDir: string;

beforeAll(async () => {
  storageDir = await mkdtemp(path.join(tmpdir(), "proofchain-dash-"));
  process.env.STORAGE_DIR = storageDir;
  process.env.BLOCKCHAIN_MODE = "mock";
});

afterAll(async () => {
  await rm(storageDir, { recursive: true, force: true });
  await resetDatabase();
  await testPrisma.$disconnect();
});

beforeEach(resetDatabase);

function pdf(body: string, name = "doc.pdf"): File {
  return new File([`%PDF-1.7\n${body}`], name, { type: "application/pdf" });
}

async function seedOrg(name = "FM Global Logistics") {
  const user = await testPrisma.user.create({
    data: {
      name: "Faiz Ismail",
      email: `${crypto.randomUUID()}@example.test`,
      passwordHash: await hashPassword("ProofChain123"),
    },
  });
  const organization = await testPrisma.$transaction((tx) =>
    createOrganizationWithOwner(tx, { organizationName: name, userId: user.id }),
  );
  return { user, organization };
}

describe("getDashboardStats", () => {
  it("counts a registered document as registered, and a verified one as both", async () => {
    const { user, organization } = await seedOrg();

    const first = await createDocumentFromUpload({
      organizationId: organization.id,
      userId: user.id,
      file: pdf("one", "one.pdf"),
      documentType: DocumentType.BILL_OF_LADING,
    });
    await registerDocumentProof({
      documentId: first.id,
      organizationId: organization.id,
      userId: user.id,
    });

    const second = await createDocumentFromUpload({
      organizationId: organization.id,
      userId: user.id,
      file: pdf("two", "two.pdf"),
      documentType: DocumentType.CONTRACT,
    });
    await registerDocumentProof({
      documentId: second.id,
      organizationId: organization.id,
      userId: user.id,
    });
    await testPrisma.document.update({
      where: { id: second.id },
      data: { status: DocumentStatus.VERIFIED },
    });

    const stats = await getDashboardStats(organization.id);

    // A verified document is still a registered one; the count must not drop
    // when a customer checks a document.
    expect(stats.total).toBe(2);
    expect(stats.registered).toBe(2);
    expect(stats.verified).toBe(1);
  });

  it("counts pending and failed separately", async () => {
    const { user, organization } = await seedOrg();

    const doc = await createDocumentFromUpload({
      organizationId: organization.id,
      userId: user.id,
      file: pdf("pending"),
      documentType: DocumentType.OTHER,
    });
    await testPrisma.document.update({
      where: { id: doc.id },
      data: { status: DocumentStatus.PENDING },
    });

    const failed = await createDocumentFromUpload({
      organizationId: organization.id,
      userId: user.id,
      file: pdf("failed", "failed.pdf"),
      documentType: DocumentType.OTHER,
    });
    await testPrisma.document.update({
      where: { id: failed.id },
      data: { status: DocumentStatus.FAILED },
    });

    const stats = await getDashboardStats(organization.id);
    expect(stats.pending).toBe(1);
    expect(stats.failed).toBe(1);
    expect(stats.registered).toBe(0);
  });

  it("counts only the caller's organization", async () => {
    const a = await seedOrg("Org A");
    const b = await seedOrg("Org B");

    await createDocumentFromUpload({
      organizationId: a.organization.id,
      userId: a.user.id,
      file: pdf("a"),
      documentType: DocumentType.OTHER,
    });

    expect((await getDashboardStats(b.organization.id)).total).toBe(0);
    expect((await getDashboardStats(a.organization.id)).total).toBe(1);
  });
});

describe("getBlockchainStatus", () => {
  it("reports simulation rather than claiming a connection", async () => {
    const { organization } = await seedOrg();
    const status = await getBlockchainStatus(organization.id);

    expect(status.mode).toBe("mock");
    expect(status.connection).toBe("simulated");
    expect(status.contractAddress).toBeNull();
  });

  it("counts confirmed proofs for this organization only", async () => {
    const a = await seedOrg("Org A");
    const b = await seedOrg("Org B");

    const doc = await createDocumentFromUpload({
      organizationId: a.organization.id,
      userId: a.user.id,
      file: pdf("proof"),
      documentType: DocumentType.OTHER,
    });
    await registerDocumentProof({
      documentId: doc.id,
      organizationId: a.organization.id,
      userId: a.user.id,
    });

    expect((await getBlockchainStatus(a.organization.id)).proofsRecorded).toBe(1);
    expect((await getBlockchainStatus(b.organization.id)).proofsRecorded).toBe(0);
  });
});

describe("getRecentActivity", () => {
  it("returns the newest entries first, bounded by the limit", async () => {
    const { user, organization } = await seedOrg();

    for (let index = 0; index < 8; index += 1) {
      await recordActivity({
        type: ActivityType.DOCUMENT_UPLOADED,
        message: `Event ${index}`,
        organizationId: organization.id,
        userId: user.id,
      });
    }

    const recent = await getRecentActivity(organization.id, 5);
    expect(recent).toHaveLength(5);
    expect(recent[0].message).toBe("Event 7");
  });

  it("never returns another organization's activity", async () => {
    const a = await seedOrg("Org A");
    const b = await seedOrg("Org B");

    await recordActivity({
      type: ActivityType.DOCUMENT_UPLOADED,
      message: "Org A secret filename.pdf",
      organizationId: a.organization.id,
    });

    const recent = await getRecentActivity(b.organization.id);
    expect(JSON.stringify(recent)).not.toContain("secret filename");
  });
});

describe("listActivity", () => {
  async function seedMixedActivity() {
    const { user, organization } = await seedOrg();

    await recordActivity({
      type: ActivityType.DOCUMENT_UPLOADED,
      message: "Uploaded bill-of-lading.pdf",
      organizationId: organization.id,
      userId: user.id,
    });
    await recordActivity({
      type: ActivityType.BLOCKCHAIN_REGISTRATION_COMPLETED,
      message: "Blockchain proof created for bill-of-lading.pdf",
      organizationId: organization.id,
      userId: user.id,
    });
    await recordActivity({
      type: ActivityType.DOCUMENT_VERIFIED,
      message: "invoice.pdf was verified",
      organizationId: organization.id,
    });

    return { user, organization };
  }

  it("filters by activity group", async () => {
    const { organization } = await seedMixedActivity();

    const proofs = await listActivity(organization.id, {
      page: 1,
      pageSize: 25,
      group: "proofs",
    });

    expect(proofs.pagination.total).toBe(1);
    expect(proofs.entries[0].type).toBe(
      ActivityType.BLOCKCHAIN_REGISTRATION_COMPLETED,
    );
  });

  it("searches the message text, case-insensitively", async () => {
    const { organization } = await seedMixedActivity();

    const found = await listActivity(organization.id, {
      page: 1,
      pageSize: 25,
      q: "INVOICE",
    });

    expect(found.pagination.total).toBe(1);
    expect(found.entries[0].message).toContain("invoice.pdf");
  });

  it("paginates", async () => {
    const { organization } = await seedMixedActivity();

    // Four entries: the three seeded above plus the organization's own
    // creation event, which is itself part of the audit trail.
    const first = await listActivity(organization.id, { page: 1, pageSize: 2 });
    expect(first.entries).toHaveLength(2);
    expect(first.pagination.total).toBe(4);
    expect(first.pagination.totalPages).toBe(2);

    const second = await listActivity(organization.id, { page: 2, pageSize: 2 });
    expect(second.entries).toHaveLength(2);
    expect(
      new Set([...first.entries, ...second.entries].map((e) => e.id)).size,
    ).toBe(4);
  });

  it("is scoped to the caller's organization", async () => {
    await seedMixedActivity();
    const other = await seedOrg("Other Co");

    const result = await listActivity(other.organization.id, {
      page: 1,
      pageSize: 25,
    });
    // Only its own creation event.
    expect(
      result.entries.every(
        (entry) => entry.type === ActivityType.ORGANIZATION_CREATED,
      ),
    ).toBe(true);
  });
});
