import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  DocumentStatus,
  DocumentType,
  RegistrationStatus,
  VerificationMethod,
  VerificationResult,
} from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/response";
import { hashPassword } from "@/lib/auth/password";
import { createDocumentFromUpload } from "@/lib/services/documents";
import { sha256 } from "@/lib/services/hashing";
import { createOrganizationWithOwner } from "@/lib/services/organizations";
import { registerDocumentProof } from "@/lib/services/registrations";
import {
  findProofByVerificationId,
  recordVerification,
  verifyHash,
} from "@/lib/services/verification";
import { isVerificationId } from "@/lib/verification/id";
import { resetDatabase, testPrisma } from "../helpers/db";

let storageDir: string;

beforeAll(async () => {
  storageDir = await mkdtemp(path.join(tmpdir(), "proofchain-verify-"));
  process.env.STORAGE_DIR = storageDir;
  process.env.BLOCKCHAIN_MODE = "mock";
});

afterAll(async () => {
  await rm(storageDir, { recursive: true, force: true });
  await resetDatabase();
  await testPrisma.$disconnect();
});

beforeEach(resetDatabase);

function pdf(body: string, name = "bill-of-lading.pdf"): File {
  return new File([`%PDF-1.7\n${body}`], name, { type: "application/pdf" });
}

async function seedRegisteredDocument(body = "Bill of lading ABC123") {
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

  const file = pdf(body);
  const document = await createDocumentFromUpload({
    organizationId: organization.id,
    userId: user.id,
    file,
    documentType: DocumentType.BILL_OF_LADING,
  });

  const registration = await registerDocumentProof({
    documentId: document.id,
    organizationId: organization.id,
    userId: user.id,
  });

  return { user, organization, document, registration, file };
}

describe("registerDocumentProof", () => {
  it("mints a well-formed verification id", async () => {
    const { registration } = await seedRegisteredDocument();
    expect(isVerificationId(registration.verificationId)).toBe(true);
  });

  it("anchors the document's own fingerprint, unchanged", async () => {
    const { registration, document } = await seedRegisteredDocument();
    expect(registration.documentHash).toBe(document.sha256Hash);
  });

  it("records a transaction, block number and issuer", async () => {
    const { registration } = await seedRegisteredDocument();

    expect(registration.status).toBe(RegistrationStatus.CONFIRMED);
    expect(registration.transactionHash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(registration.blockNumber).toBeGreaterThan(0n);
    expect(registration.chainId).toBe(84532);
    expect(registration.issuerAddress).toMatch(/^0x[a-f0-9]{40}$/);
  });

  it("marks simulated proofs as MOCK so they cannot pass as real", async () => {
    const { registration } = await seedRegisteredDocument();
    expect(registration.mode).toBe("MOCK");
  });

  it("moves the document to REGISTERED", async () => {
    const { document } = await seedRegisteredDocument();
    const refreshed = await testPrisma.document.findUniqueOrThrow({
      where: { id: document.id },
    });
    expect(refreshed.status).toBe(DocumentStatus.REGISTERED);
  });

  it("logs the start and completion of registration", async () => {
    const { document } = await seedRegisteredDocument();

    const types = (
      await testPrisma.activityLog.findMany({
        where: { documentId: document.id },
        orderBy: { createdAt: "asc" },
      })
    ).map((entry) => entry.type);

    expect(types).toContain("BLOCKCHAIN_REGISTRATION_STARTED");
    expect(types).toContain("BLOCKCHAIN_REGISTRATION_COMPLETED");
  });

  it("refuses to register the same document twice", async () => {
    const { document, organization, user } = await seedRegisteredDocument();

    await expect(
      registerDocumentProof({
        documentId: document.id,
        organizationId: organization.id,
        userId: user.id,
      }),
    ).rejects.toThrow(/already has a blockchain proof/);
  });

  it("refuses to register another organization's document", async () => {
    const { document } = await seedRegisteredDocument();

    const outsider = await testPrisma.user.create({
      data: {
        name: "Outsider",
        email: "outsider@example.test",
        passwordHash: await hashPassword("ProofChain123"),
      },
    });
    const otherOrg = await testPrisma.$transaction((tx) =>
      createOrganizationWithOwner(tx, {
        organizationName: "Other Co",
        userId: outsider.id,
      }),
    );

    await expect(
      registerDocumentProof({
        documentId: document.id,
        organizationId: otherOrg.id,
        userId: outsider.id,
      }),
    ).rejects.toThrow(ApiError);
  });

  it("gives distinct verification ids to distinct documents", async () => {
    const first = await seedRegisteredDocument("One");
    const second = await seedRegisteredDocument("Two");
    expect(first.registration.verificationId).not.toBe(
      second.registration.verificationId,
    );
  });
});

describe("findProofByVerificationId", () => {
  it("returns the proof for a valid id, without needing a session", async () => {
    const { registration, organization } = await seedRegisteredDocument();

    const outcome = await findProofByVerificationId(
      registration.verificationId,
    );

    expect(outcome.status).toBe("verified");
    if (outcome.status !== "verified") return;
    expect(outcome.proof.registeredBy).toBe(organization.name);
    expect(outcome.proof.documentType).toBe("Bill of Lading");
  });

  it("accepts a lowercase, hyphen-less id typed from paper", async () => {
    const { registration } = await seedRegisteredDocument();
    const typed = registration.verificationId.toLowerCase().replace("-", "");

    const outcome = await findProofByVerificationId(typed);
    expect(outcome.status).toBe("verified");
  });

  it("never exposes the filename, uploader or file size", async () => {
    const { registration } = await seedRegisteredDocument();
    const outcome = await findProofByVerificationId(
      registration.verificationId,
    );

    // The public record must not leak what the document is about.
    const serialised = JSON.stringify(outcome);
    expect(serialised).not.toContain("bill-of-lading.pdf");
    expect(serialised).not.toContain("Faiz Ismail");
    expect(serialised).not.toContain("storagePath");
  });

  it("reports an unknown or malformed id as not found", async () => {
    expect((await findProofByVerificationId("PC-ZZZZZZ")).status).toBe(
      "not_found",
    );
    expect((await findProofByVerificationId("garbage")).status).toBe(
      "not_found",
    );
  });

  it("reports an unconfirmed registration as pending, not verified", async () => {
    const { registration } = await seedRegisteredDocument();
    await testPrisma.blockchainRegistration.update({
      where: { id: registration.id },
      data: { status: RegistrationStatus.PENDING },
    });

    const outcome = await findProofByVerificationId(
      registration.verificationId,
    );
    expect(outcome.status).toBe("pending");
  });
});

describe("verifyHash", () => {
  it("verifies the exact registered document", async () => {
    const { document } = await seedRegisteredDocument();

    const outcome = await verifyHash({ sha256Hash: document.sha256Hash });
    expect(outcome.status).toBe("verified");
  });

  it("does not verify a document that was never registered", async () => {
    await seedRegisteredDocument();
    const outcome = await verifyHash({
      sha256Hash: sha256(new TextEncoder().encode("%PDF-1.7 a stranger")),
    });
    expect(outcome.status).toBe("not_found");
  });

  it("reports a mismatch when checked against a specific proof", async () => {
    const { registration } = await seedRegisteredDocument();
    const tamperedHash = sha256(
      new TextEncoder().encode("%PDF-1.7\nBill of lading ABC124"),
    );

    const outcome = await verifyHash({
      sha256Hash: tamperedHash,
      verificationId: registration.verificationId,
    });

    // Distinguishing "different document" from "never registered" is the
    // point of supplying a verification id.
    expect(outcome.status).toBe("mismatch");
    if (outcome.status !== "mismatch") return;
    expect(outcome.submittedHash).toBe(tamperedHash);
    expect(outcome.proof.documentHash).not.toBe(tamperedHash);
  });

  it("detects a single changed byte", async () => {
    const { document } = await seedRegisteredDocument("Invoice total: 1000");
    const altered = sha256(
      new TextEncoder().encode("%PDF-1.7\nInvoice total: 9000"),
    );

    expect(altered).not.toBe(document.sha256Hash);
    expect((await verifyHash({ sha256Hash: altered })).status).toBe(
      "not_found",
    );
  });
});

describe("recordVerification", () => {
  it("records a successful check and marks the document verified", async () => {
    const { registration, document } = await seedRegisteredDocument();
    const outcome = await findProofByVerificationId(
      registration.verificationId,
    );

    await recordVerification({
      outcome,
      method: VerificationMethod.VERIFICATION_ID,
    });

    const record = await testPrisma.verification.findFirstOrThrow({
      where: { verificationId: registration.verificationId },
    });
    expect(record.result).toBe(VerificationResult.MATCH);
    expect(record.verifiedBy).toBeNull(); // anonymous visitor

    const refreshed = await testPrisma.document.findUniqueOrThrow({
      where: { id: document.id },
    });
    expect(refreshed.status).toBe(DocumentStatus.VERIFIED);
  });

  it("records a mismatch without changing the document status", async () => {
    const { registration, document } = await seedRegisteredDocument();
    const outcome = await verifyHash({
      sha256Hash: sha256(new TextEncoder().encode("%PDF-1.7 different")),
      verificationId: registration.verificationId,
    });

    await recordVerification({
      outcome,
      method: VerificationMethod.FILE_UPLOAD,
      submittedHash: "a".repeat(64),
    });

    const record = await testPrisma.verification.findFirstOrThrow({
      where: { verificationId: registration.verificationId },
    });
    expect(record.result).toBe(VerificationResult.MISMATCH);

    const refreshed = await testPrisma.document.findUniqueOrThrow({
      where: { id: document.id },
    });
    expect(refreshed.status).toBe(DocumentStatus.REGISTERED);
  });

  it("records an unmatched check without attaching it to a document", async () => {
    await recordVerification({
      outcome: { status: "not_found" },
      method: VerificationMethod.FILE_UPLOAD,
      submittedHash: "b".repeat(64),
    });

    const record = await testPrisma.verification.findFirstOrThrow({});
    expect(record.result).toBe(VerificationResult.NOT_FOUND);
    expect(record.documentId).toBeNull();
  });
});
