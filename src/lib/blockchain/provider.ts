import { MockBlockchainProvider } from "@/lib/blockchain/mock-provider";
import type { BlockchainProvider } from "@/lib/blockchain/types";
import { getServerEnv } from "@/lib/env";

/**
 * Resolves the provider for the configured `BLOCKCHAIN_MODE`.
 *
 * Real anchoring lands with the smart contract in a later phase. Until then
 * `BLOCKCHAIN_MODE=real` fails loudly rather than silently simulating: an
 * operator who asked for real proofs must never get mock ones without knowing.
 */
export function getBlockchainProvider(): BlockchainProvider {
  const mode = getServerEnv().BLOCKCHAIN_MODE;

  if (mode === "real") {
    throw new Error(
      "BLOCKCHAIN_MODE=real is not supported yet — on-chain anchoring arrives with the ProofChainRegistry contract. Set BLOCKCHAIN_MODE=mock to continue.",
    );
  }

  return new MockBlockchainProvider();
}
