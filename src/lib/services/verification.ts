import {
  ActivityType,
  DocumentStatus,
  RegistrationStatus,
  VerificationMethod,
  VerificationResult,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { documentTypeLabel } from "@/lib/documents/types";
import { recordActivity } from "@/lib/services/activity";
import { transactionUrl } from "@/lib/blockchain/networks";
import { normalizeVerificationId } from "@/lib/verification/id";

/**
 * What a public visitor is allowed to see.
 *
 * Deliberately narrow. The filename, uploader, file size and storage location
 * are all withheld: "Termination_Letter_J_Smith.pdf" would leak the very thing
 * the document is about. What remains is exactly enough to answer "is this
 * document authentic, who vouched for it, and when".
 */
export type PublicProof = {
  verificationId: string;
  documentType: string;
  documentHash: string;
  registeredBy: string;
  registeredAt: Date;
  networkName: string | null;
  chainId: number | null;
  transactionHash: string | null;
  transactionUrl: string | null;
  contractAddress: string | null;
  issuerAddress: string | null;
  isSimulated: boolean;
};

export type VerificationOutcome =
  | { status: "not_found" }
  | { status: "pending"; verificationId: string }
  | { status: "verified"; proof: PublicProof }
  | { status: "mismatch"; proof: PublicProof; submittedHash: string };

/** Shapes a confirmed registration into the public view. */
function toPublicProof(registration: {
  verificationId: string;
  documentHash: string;
  networkName: string | null;
  chainId: number | null;
  transactionHash: string | null;
  contractAddress: string | null;
  issuerAddress: string | null;
  registeredAt: Date | null;
  mode: string;
  createdAt: Date;
  document: {
    documentType: Parameters<typeof documentTypeLabel>[0];
    documentTypeLabel: string | null;
    organization: { name: string };
  };
}): PublicProof {
  return {
    verificationId: registration.verificationId,
    documentType: documentTypeLabel(
      registration.document.documentType,
      registration.document.documentTypeLabel,
    ),
    documentHash: registration.documentHash,
    registeredBy: registration.document.organization.name,
    registeredAt: registration.registeredAt ?? registration.createdAt,
    networkName: registration.networkName,
    chainId: registration.chainId,
    transactionHash: registration.transactionHash,
    transactionUrl: registration.transactionHash
      ? transactionUrl(registration.chainId, registration.transactionHash)
      : null,
    contractAddress: registration.contractAddress,
    issuerAddress: registration.issuerAddress,
    isSimulated: registration.mode === "MOCK",
  };
}

const PUBLIC_SELECT = {
  verificationId: true,
  documentHash: true,
  networkName: true,
  chainId: true,
  transactionHash: true,
  contractAddress: true,
  issuerAddress: true,
  registeredAt: true,
  status: true,
  mode: true,
  createdAt: true,
  documentId: true,
  document: {
    select: {
      documentType: true,
      documentTypeLabel: true,
      organization: { select: { name: true } },
    },
  },
} as const;

/**
 * Looks up a proof by its public verification id.
 *
 * No authentication: this is the whole point of the product. A counterparty
 * with a link must be able to check a document without an account.
 */
export async function findProofByVerificationId(
  rawId: string,
): Promise<VerificationOutcome> {
  const verificationId = normalizeVerificationId(rawId);
  if (!verificationId) return { status: "not_found" };

  const registration = await prisma.blockchainRegistration.findUnique({
    where: { verificationId },
    select: PUBLIC_SELECT,
  });

  if (!registration) return { status: "not_found" };

  // A proof that never confirmed is reported as pending rather than verified —
  // claiming otherwise would be the one lie this product cannot afford.
  if (registration.status !== RegistrationStatus.CONFIRMED) {
    return { status: "pending", verificationId };
  }

  return { status: "verified", proof: toPublicProof(registration) };
}

/**
 * Checks an uploaded document's fingerprint against registered proofs.
 *
 * When a verification id is supplied the comparison is against that specific
 * proof, which distinguishes "this is a different document" from "this document
 * was never registered" — a distinction that matters to whoever is holding the
 * paper.
 */
export async function verifyHash(input: {
  sha256Hash: string;
  verificationId?: string | null;
}): Promise<VerificationOutcome> {
  if (input.verificationId) {
    const outcome = await findProofByVerificationId(input.verificationId);
    if (outcome.status !== "verified") return outcome;

    return outcome.proof.documentHash === input.sha256Hash
      ? outcome
      : {
          status: "mismatch",
          proof: outcome.proof,
          submittedHash: input.sha256Hash,
        };
  }

  const registration = await prisma.blockchainRegistration.findFirst({
    where: {
      documentHash: input.sha256Hash,
      status: RegistrationStatus.CONFIRMED,
    },
    orderBy: { registeredAt: "asc" },
    select: PUBLIC_SELECT,
  });

  if (!registration) return { status: "not_found" };
  return { status: "verified", proof: toPublicProof(registration) };
}

/**
 * Persists a verification attempt for the audit trail.
 *
 * Anonymous checks are recorded too, since an organization wants to know its
 * documents are being verified. Best-effort: a logging failure must never turn
 * a successful verification into an error for the visitor.
 */
export async function recordVerification(input: {
  outcome: VerificationOutcome;
  method: VerificationMethod;
  submittedHash?: string | null;
  verifiedBy?: string | null;
}): Promise<void> {
  const result =
    input.outcome.status === "verified"
      ? VerificationResult.MATCH
      : input.outcome.status === "mismatch"
        ? VerificationResult.MISMATCH
        : VerificationResult.NOT_FOUND;

  const verificationId =
    input.outcome.status === "verified" || input.outcome.status === "mismatch"
      ? input.outcome.proof.verificationId
      : input.outcome.status === "pending"
        ? input.outcome.verificationId
        : null;

  try {
    const registration = verificationId
      ? await prisma.blockchainRegistration.findUnique({
          where: { verificationId },
          select: {
            documentId: true,
            document: { select: { organizationId: true, filename: true } },
          },
        })
      : null;

    await prisma.verification.create({
      data: {
        documentId: registration?.documentId ?? null,
        verificationId,
        submittedHash: input.submittedHash ?? null,
        result,
        method: input.method,
        verifiedBy: input.verifiedBy ?? null,
      },
    });

    if (registration) {
      await recordActivity({
        type:
          result === VerificationResult.MATCH
            ? ActivityType.DOCUMENT_VERIFIED
            : ActivityType.VERIFICATION_FAILED,
        message:
          result === VerificationResult.MATCH
            ? `${registration.document.filename} was verified`
            : `A document did not match the proof for ${verificationId}`,
        organizationId: registration.document.organizationId,
        documentId: registration.documentId,
        userId: input.verifiedBy ?? null,
        metadata: { verificationId, method: input.method },
      });

      // A document that has been checked at least once is marked VERIFIED, so
      // the owning organization can see which of its proofs are actually used.
      if (result === VerificationResult.MATCH) {
        await prisma.document.updateMany({
          where: {
            id: registration.documentId,
            status: DocumentStatus.REGISTERED,
          },
          data: { status: DocumentStatus.VERIFIED },
        });
      }
    }
  } catch (error) {
    console.error("[verification] Failed to record verification:", error);
  }
}
