import type { BlockchainMode } from "@prisma/client";

export type AnchorRequest = {
  /** The SHA-256 fingerprint, as 64 lowercase hex characters. */
  documentHash: string;
  verificationId: string;
  issuerAddress: string | null;
};

export type AnchorResult = {
  mode: BlockchainMode;
  chainId: number;
  networkName: string;
  contractAddress: string;
  transactionHash: string;
  blockNumber: bigint;
  issuerAddress: string;
  registeredAt: Date;
};

/**
 * Anchors a document fingerprint.
 *
 * Implementations must never receive or transmit the document itself — only
 * its hash, the verification id, and the issuer.
 */
export type BlockchainProvider = {
  readonly mode: BlockchainMode;
  anchor(request: AnchorRequest): Promise<AnchorResult>;
};
