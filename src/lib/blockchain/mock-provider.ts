import { createHash, randomBytes } from "node:crypto";

import { BlockchainMode } from "@prisma/client";

import { BASE_SEPOLIA } from "@/lib/blockchain/networks";
import type {
  AnchorRequest,
  AnchorResult,
  BlockchainProvider,
} from "@/lib/blockchain/types";
import { isSha256Hex } from "@/lib/services/hashing";

/**
 * A plausible-looking contract address for simulation. Derived from a fixed
 * string so it is stable across restarts, which makes mock data easier to read
 * during development.
 */
const MOCK_CONTRACT_ADDRESS = `0x${createHash("sha256")
  .update("ProofChainRegistry:mock")
  .digest("hex")
  .slice(0, 40)}`;

const MOCK_ISSUER_ADDRESS = `0x${createHash("sha256")
  .update("ProofChain:mock-issuer")
  .digest("hex")
  .slice(0, 40)}`;

/** Roughly the height of Base Sepolia at the time of writing. */
const MOCK_BASE_BLOCK = 18_500_000n;

/** Anchor for the simulated block clock, so heights stay in a plausible range. */
const MOCK_EPOCH_MS = Date.UTC(2026, 0, 1);

/** Base produces a block every two seconds. */
const MOCK_BLOCK_TIME_MS = 2000;

/**
 * Simulates anchoring so the whole product can be built, demonstrated and
 * tested before a contract is deployed.
 *
 * Everything it returns is stored with `mode: MOCK`, and the UI labels such
 * proofs as simulated — a simulated proof must never be mistaken for a real
 * one.
 */
export class MockBlockchainProvider implements BlockchainProvider {
  readonly mode = BlockchainMode.MOCK;

  async anchor(request: AnchorRequest): Promise<AnchorResult> {
    if (!isSha256Hex(request.documentHash)) {
      throw new Error("Refusing to anchor a value that is not a SHA-256 hash");
    }

    return {
      mode: BlockchainMode.MOCK,
      chainId: BASE_SEPOLIA.chainId,
      networkName: BASE_SEPOLIA.name,
      contractAddress: MOCK_CONTRACT_ADDRESS,
      transactionHash: `0x${randomBytes(32).toString("hex")}`,
      // Advances over time so later proofs get higher block numbers, the way a
      // real chain behaves, while staying in the range a reader would expect
      // for Base Sepolia.
      blockNumber:
        MOCK_BASE_BLOCK +
        BigInt(Math.max(0, Math.floor((Date.now() - MOCK_EPOCH_MS) / MOCK_BLOCK_TIME_MS))),
      issuerAddress: request.issuerAddress ?? MOCK_ISSUER_ADDRESS,
      registeredAt: new Date(),
    };
  }
}
