import { BlockchainMode } from "@prisma/client";
import { decodeEventLog, type Hash, type TransactionReceipt } from "viem";

import { PROOF_CHAIN_REGISTRY_ABI } from "@/lib/blockchain/abi";
import { getContractAddress, getPublicClient } from "@/lib/blockchain/client";
import { BASE_SEPOLIA } from "@/lib/blockchain/networks";
import type { AnchorResult } from "@/lib/blockchain/types";
import { toBytes32 } from "@/lib/services/hashing";

export class OnChainVerificationError extends Error {}

/**
 * Confirms that a transaction really registered the expected proof.
 *
 * This is the security boundary for real mode. The browser reports a
 * transaction hash and nothing else is taken on trust: the receipt is fetched
 * from the chain, the target contract is checked, and the emitted
 * `DocumentRegistered` event must carry exactly the fingerprint and
 * verification id we reserved. A client that submits an unrelated, failed, or
 * fabricated transaction gets a rejection, not a proof.
 */
export async function confirmOnChainRegistration(input: {
  transactionHash: Hash;
  expectedDocumentHash: string;
  expectedVerificationId: string;
}): Promise<AnchorResult> {
  const client = getPublicClient();
  const contractAddress = getContractAddress();

  let receipt: TransactionReceipt;
  try {
    receipt = await client.getTransactionReceipt({
      hash: input.transactionHash,
    });
  } catch {
    throw new OnChainVerificationError(
      "That transaction could not be found on Base Sepolia yet. Wait for it to be mined and try again.",
    );
  }

  if (receipt.status !== "success") {
    throw new OnChainVerificationError(
      "That transaction failed on the blockchain, so no proof was recorded.",
    );
  }

  if (receipt.to?.toLowerCase() !== contractAddress) {
    throw new OnChainVerificationError(
      "That transaction was not sent to the ProofChain registry contract.",
    );
  }

  const expectedHash = toBytes32(input.expectedDocumentHash);

  // Only logs emitted by the registry itself are considered; a transaction may
  // contain events from any number of other contracts.
  const match = receipt.logs
    .filter((log) => log.address.toLowerCase() === contractAddress)
    .map((log) => {
      try {
        return decodeEventLog({
          abi: PROOF_CHAIN_REGISTRY_ABI,
          data: log.data,
          topics: log.topics,
        });
      } catch {
        return null;
      }
    })
    .find(
      (event) =>
        event?.eventName === "DocumentRegistered" &&
        event.args.documentHash?.toLowerCase() === expectedHash &&
        event.args.verificationId === input.expectedVerificationId,
    );

  if (!match || match.eventName !== "DocumentRegistered") {
    throw new OnChainVerificationError(
      "That transaction did not register this document. Nothing has been recorded.",
    );
  }

  const block = await client.getBlock({ blockNumber: receipt.blockNumber });

  return {
    mode: BlockchainMode.REAL,
    chainId: BASE_SEPOLIA.chainId,
    networkName: BASE_SEPOLIA.name,
    contractAddress,
    transactionHash: receipt.transactionHash,
    blockNumber: receipt.blockNumber,
    // Taken from the event, not from the caller.
    issuerAddress: match.args.issuer as string,
    registeredAt: new Date(Number(block.timestamp) * 1000),
  };
}
