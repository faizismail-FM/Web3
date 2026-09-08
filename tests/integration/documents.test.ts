import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { DocumentStatus, DocumentType, MemberRole } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/response";
import { hashPassword } from "@/lib/auth/password";
import { createDocumentFromUpload, listDocuments } from "@/lib/services/documents";
import { sha256 } from "@/lib/services/hashing";
import { createOrganizationWithOwner } from "@/lib/services/organizations";
import { resetDatabase, testPrisma } from "../helpers/db";

let storageDir: string;

beforeAll(async () => {
  // Uploads land in a throwaway directory, never the developer's storage.
  storageDir = await mkdtemp(path.join(tmpdir(), "proofchain-test-"));
  process.env.STORAGE_DIR = storageDir;
});

afterAll(async () => {
  await rm(storageDir, { recursive: true, force: true });
  await resetDatabase();
  await testPrisma.$disconnect();
});

beforeEach(resetDatabase);

function pdf(body: string): File {
  return new File([`%PDF-1.7\n${body}`], "bill-of-lading.pdf", {
    type: "application/pdf",
  });
}

async function seedOrganization(name = "FM Global Logistics") {
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

describe("createDocumentFromUpload", () => {
  it("computes the hash server-side from the stored bytes", async () => {
    const { user, organization } = await seedOrganization();
    const file = pdf("Bill of lading ABC123");

    const document = await createDocumentFromUpload({
      organizationId: organization.id,
      userId: user.id,
      file,
      documentType: DocumentType.BILL_OF_LADING,
    });

    const expected = sha256(new Uint8Array(await file.arrayBuffer()));
    expect(document.sha256Hash).toBe(expected);
    expect(document.sha256Hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("writes the file and the stored bytes hash to the recorded value", async () => {
    const { user, organization } = await seedOrganization();

    const document = await createDocumentFromUpload({
      organizationId: organization.id,
      userId: user.id,
      file: pdf("Commercial invoice 9981"),
      documentType: DocumentType.COMMERCIAL_INVOICE,
    });

    const stored = await readFile(path.join(storageDir, document.storagePath));
    expect(sha256(new Uint8Array(stored))).toBe(document.sha256Hash);
  });

  it("stores the document outside any public directory, under an opaque name", async () => {
    const { user, organization } = await seedOrganization();

    const document = await createDocumentFromUpload({
      organizationId: organization.id,
      userId: user.id,
      file: pdf("Contract"),
      documentType: DocumentType.CONTRACT,
    });

    // Partitioned by organization, and named by UUID rather than by the
    // uploaded filename.
    expect(document.storagePath.startsWith(`${organization.id}/`)).toBe(true);
    expect(document.storagePath).not.toContain("bill-of-lading");
    expect(document.storagePath).toMatch(/\.pdf$/);
  });

  it("starts a new document unregistered", async () => {
    const { user, organization } = await seedOrganization();

    const document = await createDocumentFromUpload({
      organizationId: organization.id,
      userId: user.id,
      file: pdf("Packing list"),
      documentType: DocumentType.PACKING_LIST,
    });

    // Uploading must never publish anything by itself.
    expect(document.status).toBe(DocumentStatus.DRAFT);
    const registration = await testPrisma.blockchainRegistration.findFirst();
    expect(registration).toBeNull();
  });

  it("records upload and hash-generation activity", async () => {
    const { user, organization } = await seedOrganization();

    const document = await createDocumentFromUpload({
      organizationId: organization.id,
      userId: user.id,
      file: pdf("Certificate"),
      documentType: DocumentType.CERTIFICATE,
    });

    const activity = await testPrisma.activityLog.findMany({
      where: { documentId: document.id },
      orderBy: { createdAt: "asc" },
    });
    expect(activity.map((entry) => entry.type)).toEqual([
      "DOCUMENT_UPLOADED",
      "HASH_GENERATED",
    ]);
  });

  it("rejects the same document twice in one organization", async () => {
    const { user, organization } = await seedOrganization();

    await createDocumentFromUpload({
      organizationId: organization.id,
      userId: user.id,
      file: pdf("Duplicate"),
      documentType: DocumentType.OTHER,
    });

    await expect(
      createDocumentFromUpload({
        organizationId: organization.id,
        userId: user.id,
        file: pdf("Duplicate"),
        documentType: DocumentType.OTHER,
      }),
    ).rejects.toThrow(ApiError);
  });

  it("allows two organizations to register the same document independently", async () => {
    const a = await seedOrganization("Org A");
    const b = await seedOrganization("Org B");

    const first = await createDocumentFromUpload({
      organizationId: a.organization.id,
      userId: a.user.id,
      file: pdf("Shared bill of lading"),
      documentType: DocumentType.BILL_OF_LADING,
    });

    const second = await createDocumentFromUpload({
      organizationId: b.organization.id,
      userId: b.user.id,
      file: pdf("Shared bill of lading"),
      documentType: DocumentType.BILL_OF_LADING,
    });

    // Both parties to a shipment may hold the same paperwork.
    expect(second.sha256Hash).toBe(first.sha256Hash);
    expect(second.organizationId).not.toBe(first.organizationId);
  });

  it("rejects a non-PDF disguised as one, and stores nothing", async () => {
    const { user, organization } = await seedOrganization();

    const disguised = new File(["MZ not really a pdf"], "malware.pdf", {
      type: "application/pdf",
    });

    await expect(
      createDocumentFromUpload({
        organizationId: organization.id,
        userId: user.id,
        file: disguised,
        documentType: DocumentType.OTHER,
      }),
    ).rejects.toThrow(/not a valid PDF/);

    expect(await testPrisma.document.count()).toBe(0);
  });

  it("sanitises a traversing filename before storing it", async () => {
    const { user, organization } = await seedOrganization();

    const hostile = new File(["%PDF-1.7 payload"], "../../../etc/passwd.pdf", {
      type: "application/pdf",
    });

    const document = await createDocumentFromUpload({
      organizationId: organization.id,
      userId: user.id,
      file: hostile,
      documentType: DocumentType.OTHER,
    });

    expect(document.filename).toBe("passwd.pdf");
    expect(document.storagePath).not.toContain("..");
  });
});

describe("listDocuments", () => {
  it("returns only the requested organization's documents", async () => {
    const a = await seedOrganization("Org A");
    const b = await seedOrganization("Org B");

    await createDocumentFromUpload({
      organizationId: a.organization.id,
      userId: a.user.id,
      file: pdf("A one"),
      documentType: DocumentType.OTHER,
    });
    await createDocumentFromUpload({
      organizationId: b.organization.id,
      userId: b.user.id,
      file: pdf("B one"),
      documentType: DocumentType.OTHER,
    });

    const result = await listDocuments(a.organization.id, {
      page: 1,
      pageSize: 20,
      sort: "createdAt",
      direction: "desc",
    });

    expect(result.pagination.total).toBe(1);
    expect(
      result.documents.every(
        (document) => document.organization.id === a.organization.id,
      ),
    ).toBe(true);
  });

  it("paginates and reports the total", async () => {
    const { user, organization } = await seedOrganization();

    for (let index = 0; index < 5; index += 1) {
      await createDocumentFromUpload({
        organizationId: organization.id,
        userId: user.id,
        file: pdf(`Document ${index}`),
        documentType: DocumentType.OTHER,
      });
    }

    const page = await listDocuments(organization.id, {
      page: 2,
      pageSize: 2,
      sort: "createdAt",
      direction: "desc",
    });

    expect(page.documents).toHaveLength(2);
    expect(page.pagination.total).toBe(5);
    expect(page.pagination.totalPages).toBe(3);
  });

  it("filters by status", async () => {
    const { user, organization } = await seedOrganization();

    const document = await createDocumentFromUpload({
      organizationId: organization.id,
      userId: user.id,
      file: pdf("Registered one"),
      documentType: DocumentType.OTHER,
    });
    await testPrisma.document.update({
      where: { id: document.id },
      data: { status: DocumentStatus.REGISTERED },
    });
    await createDocumentFromUpload({
      organizationId: organization.id,
      userId: user.id,
      file: pdf("Draft one"),
      documentType: DocumentType.OTHER,
    });

    const registered = await listDocuments(organization.id, {
      page: 1,
      pageSize: 20,
      sort: "createdAt",
      direction: "desc",
      status: DocumentStatus.REGISTERED,
    });

    expect(registered.pagination.total).toBe(1);
    expect(registered.documents[0].id).toBe(document.id);
  });

  it("sorts by filename in the requested direction", async () => {
    const { user, organization } = await seedOrganization();

    for (const name of ["zebra.pdf", "alpha.pdf", "middle.pdf"]) {
      await createDocumentFromUpload({
        organizationId: organization.id,
        userId: user.id,
        file: new File([`%PDF-1.7 ${name}`], name, {
          type: "application/pdf",
        }),
        documentType: DocumentType.OTHER,
      });
    }

    const ascending = await listDocuments(organization.id, {
      page: 1,
      pageSize: 20,
      sort: "filename",
      direction: "asc",
    });

    expect(ascending.documents.map((document) => document.filename)).toEqual([
      "alpha.pdf",
      "middle.pdf",
      "zebra.pdf",
    ]);
  });
});

describe("uploader role", () => {
  it("records who uploaded each document", async () => {
    const { user, organization } = await seedOrganization();

    const member = await testPrisma.user.create({
      data: {
        name: "Daniel Tan",
        email: "member@example.test",
        passwordHash: await hashPassword("ProofChain123"),
        organizationId: organization.id,
      },
    });
    await testPrisma.membership.create({
      data: {
        userId: member.id,
        organizationId: organization.id,
        role: MemberRole.MEMBER,
      },
    });

    await createDocumentFromUpload({
      organizationId: organization.id,
      userId: member.id,
      file: pdf("Uploaded by member"),
      documentType: DocumentType.OTHER,
    });

    const listed = await listDocuments(organization.id, {
      page: 1,
      pageSize: 20,
      sort: "createdAt",
      direction: "desc",
    });

    expect(listed.documents[0].uploader.name).toBe("Daniel Tan");
    expect(user.id).not.toBe(member.id);
  });
});
