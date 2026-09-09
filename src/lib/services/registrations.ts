import {
  ActivityType,
  BlockchainMode,
  DocumentStatus,
  Prisma,
  RegistrationStatus,
} from "@prisma/client";

import { ApiError } from "@/lib/api/response";
import { getContractAddress } from "@/lib/blockchain/client";
import { BASE_SEPOLIA } from "@/lib/blockchain/networks";
import { getBlockchainProvider } from "@/lib/blockchain/provider";
import {
  OnChainVerificationError,
  confirmOnChainRegistration,
} from "@/lib/blockchain/real-provider";
import { getServerEnv } from "@/lib/env";
import { toBytes32 } from "@/lib/services/hashing";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/services/activity";
import { generateVerificationId } from "@/lib/verification/id";

/**
 * Number of attempts to find an unused verification id.
 *
 * The space is ~887 million, so a collision is already unlikely; retrying a few
 * times makes it effectively impossible without an unbounded loop.
 */
const ID_ATTEMPTS = 8;

async function reserveVerificationId(
  tx: Prisma.TransactionClient,
): Promise<string> {
  for (let attempt = 0; attempt < ID_ATTEMPTS; attempt += 1) {
    const candidate = generateVerificationId();
    const existing = await tx.blockchainRegistration.findUnique({
      where: { verificationId: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }

  throw new Error(
    "Could not allocate a unique verification id after several attempts",
  );
}

/**
 * Creates a blockchain proof for a document.
 *
 * The sequence mirrors what a real chain requires, so the same flow works
 * unchanged once the contract is deployed:
 *
 *   1. Reserve a verification id and record the attempt as PENDING.
 *   2. Ask the provider to anchor the fingerprint.
 *   3. Record the outcome — CONFIRMED with the transaction, or FAILED with the
 *      reason.
 *
 * A failure is persisted rather than thrown away, so the document shows why it
 * could not be registered instead of silently staying a draft.
 */
export async function registerDocumentProof(input: {
  documentId: string;
  organizationId: string;
  userId: string;
}) {
  const document = await loadRegisterableDocument(
    input.documentId,
    input.organizationId,
  );

  const provider = getBlockchainProvider();

  const registration = await prisma.$transaction(async (tx) => {
    const verificationId =
      document.registration?.verificationId ?? (await reserveVerificationId(tx));

    const pending = await tx.blockchainRegistration.upsert({
      where: { documentId: document.id },
      update: {
        status: RegistrationStatus.PENDING,
        errorMessage: null,
      },
      create: {
        documentId: document.id,
        verificationId,
        documentHash: document.sha256Hash,
        status: RegistrationStatus.PENDING,
        mode: provider.mode,
      },
    });

    await tx.document.update({
      where: { id: document.id },
      data: { status: DocumentStatus.PENDING },
    });

    await recordActivity(
      {
        type: ActivityType.BLOCKCHAIN_REGISTRATION_STARTED,
        message: `Started creating a blockchain proof for ${document.filename}`,
        organizationId: input.organizationId,
        userId: input.userId,
        documentId: document.id,
        metadata: { verificationId },
      },
      tx,
    );

    return pending;
  });

  try {
    const result = await provider.anchor({
      documentHash: document.sha256Hash,
      verificationId: registration.verificationId,
      issuerAddress: document.organization.walletAddress,
    });

    return await prisma.$transaction(async (tx) => {
      const confirmed = await tx.blockchainRegistration.update({
        where: { id: registration.id },
        data: {
          status: RegistrationStatus.CONFIRMED,
          mode: result.mode,
          chainId: result.chainId,
          networkName: result.networkName,
          contractAddress: result.contractAddress,
          transactionHash: result.transactionHash,
          blockNumber: result.blockNumber,
          issuerAddress: result.issuerAddress,
          registeredAt: result.registeredAt,
          errorMessage: null,
        },
      });

      await tx.document.update({
        where: { id: document.id },
        data: { status: DocumentStatus.REGISTERED },
      });

      await recordActivity(
        {
          type: ActivityType.BLOCKCHAIN_REGISTRATION_COMPLETED,
          message: `Blockchain proof created for ${document.filename}`,
          organizationId: input.organizationId,
          userId: input.userId,
          documentId: document.id,
          metadata: {
            verificationId: confirmed.verificationId,
            transactionHash: result.transactionHash,
            mode: result.mode,
          },
        },
        tx,
      );

      return confirmed;
    });
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "Unknown blockchain error";

    await prisma.$transaction(async (tx) => {
      await tx.blockchainRegistration.update({
        where: { id: registration.id },
        data: { status: RegistrationStatus.FAILED, errorMessage: reason },
      });
      await tx.document.update({
        where: { id: document.id },
        data: { status: DocumentStatus.FAILED },
      });
      await recordActivity(
        {
          type: ActivityType.BLOCKCHAIN_REGISTRATION_FAILED,
          message: `Blockchain proof failed for ${document.filename}`,
          organizationId: input.organizationId,
          userId: input.userId,
          documentId: document.id,
          metadata: { reason },
        },
        tx,
      );
    });

    console.error("[registrations] Anchoring failed:", error);
    throw new ApiError(
      "INTERNAL_ERROR",
      "The blockchain proof could not be created. Please try again.",
    );
  }
}


/**
 * Loads a document for proof creation, refusing anything outside the caller's
 * organization or already proven.
 */
async function loadRegisterableDocument(
  documentId: string,
  organizationId: string,
) {
  const document = await prisma.document.findFirst({
    where: { id: documentId, organizationId },
    include: {
      registration: true,
      organization: { select: { walletAddress: true } },
    },
  });

  if (!document) {
    throw new ApiError("NOT_FOUND", "That document could not be found.");
  }

  if (document.registration?.status === RegistrationStatus.CONFIRMED) {
    throw new ApiError(
      "CONFLICT",
      "This document already has a blockchain proof.",
    );
  }

  return document;
}

/**
 * Step one of real-mode registration: reserve the verification id and hand the
 * browser everything it needs to build the transaction.
 *
 * No proof exists yet. Nothing here is trusted later — the confirmation step
 * re-checks the reserved values against what the chain actually recorded.
 */
export async function prepareDocumentProof(input: {
  documentId: string;
  organizationId: string;
  userId: string;
}) {
  const document = await loadRegisterableDocument(
    input.documentId,
    input.organizationId,
  );

  const registration = await prisma.$transaction(async (tx) => {
    const verificationId =
      document.registration?.verificationId ?? (await reserveVerificationId(tx));

    const pending = await tx.blockchainRegistration.upsert({
      where: { documentId: document.id },
      update: { status: RegistrationStatus.PENDING, errorMessage: null },
      create: {
        documentId: document.id,
        verificationId,
        documentHash: document.sha256Hash,
        status: RegistrationStatus.PENDING,
        mode: BlockchainMode.REAL,
      },
    });

    await tx.document.update({
      where: { id: document.id },
      data: { status: DocumentStatus.PENDING },
    });

    await recordActivity(
      {
        type: ActivityType.BLOCKCHAIN_REGISTRATION_STARTED,
        message: `Started creating a blockchain proof for ${document.filename}`,
        organizationId: input.organizationId,
        userId: input.userId,
        documentId: document.id,
        metadata: { verificationId },
      },
      tx,
    );

    return pending;
  });

  return {
    verificationId: registration.verificationId,
    documentHash: toBytes32(document.sha256Hash),
    contractAddress: getContractAddress(),
    chainId: BASE_SEPOLIA.chainId,
    networkName: BASE_SEPOLIA.name,
    filename: document.filename,
    sha256Hash: document.sha256Hash,
  };
}

/**
 * Step two of real-mode registration: confirm against the chain.
 *
 * The browser supplies only a transaction hash. Everything recorded here comes
 * from the receipt and the emitted event, never from the request — this is what
 * makes a proof mean something.
 */
export async function confirmDocumentProof(input: {
  documentId: string;
  organizationId: string;
  userId: string;
  transactionHash: `0x${string}`;
}) {
  const document = await prisma.document.findFirst({
    where: { id: input.documentId, organizationId: input.organizationId },
    include: { registration: true },
  });

  if (!document) {
    throw new ApiError("NOT_FOUND", "That document could not be found.");
  }

  const registration = document.registration;
  if (!registration) {
    throw new ApiError(
      "BAD_REQUEST",
      "No registration is in progress for this document.",
    );
  }

  if (registration.status === RegistrationStatus.CONFIRMED) {
    return registration;
  }

  try {
    const result = await confirmOnChainRegistration({
      transactionHash: input.transactionHash,
      expectedDocumentHash: registration.documentHash,
      expectedVerificationId: registration.verificationId,
    });

    return await prisma.$transaction(async (tx) => {
      const confirmed = await tx.blockchainRegistration.update({
        where: { id: registration.id },
        data: {
          status: RegistrationStatus.CONFIRMED,
          mode: result.mode,
          chainId: result.chainId,
          networkName: result.networkName,
          contractAddress: result.contractAddress,
          transactionHash: result.transactionHash,
          blockNumber: result.blockNumber,
          issuerAddress: result.issuerAddress,
          registeredAt: result.registeredAt,
          errorMessage: null,
        },
      });

      await tx.document.update({
        where: { id: document.id },
        data: { status: DocumentStatus.REGISTERED },
      });

      await recordActivity(
        {
          type: ActivityType.BLOCKCHAIN_REGISTRATION_COMPLETED,
          message: `Blockchain proof created for ${document.filename}`,
          organizationId: input.organizationId,
          userId: input.userId,
          documentId: document.id,
          metadata: {
            verificationId: confirmed.verificationId,
            transactionHash: result.transactionHash,
            mode: result.mode,
          },
        },
        tx,
      );

      return confirmed;
    });
  } catch (error) {
    const reason =
      error instanceof OnChainVerificationError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Unknown blockchain error";

    await prisma.$transaction(async (tx) => {
      await tx.blockchainRegistration.update({
        where: { id: registration.id },
        data: { status: RegistrationStatus.FAILED, errorMessage: reason },
      });
      await tx.document.update({
        where: { id: document.id },
        data: { status: DocumentStatus.FAILED },
      });
      await recordActivity(
        {
          type: ActivityType.BLOCKCHAIN_REGISTRATION_FAILED,
          message: `Blockchain proof failed for ${document.filename}`,
          organizationId: input.organizationId,
          userId: input.userId,
          documentId: document.id,
          metadata: { reason },
        },
        tx,
      );
    });

    if (error instanceof OnChainVerificationError) {
      throw new ApiError("BAD_REQUEST", error.message);
    }

    console.error("[registrations] On-chain confirmation failed:", error);
    throw new ApiError(
      "INTERNAL_ERROR",
      "The blockchain proof could not be confirmed. Please try again.",
    );
  }
}

/** Whether proofs are signed by a wallet (real) or simulated on the server. */
export function requiresWalletSignature(): boolean {
  return getServerEnv().BLOCKCHAIN_MODE === "real";
}
