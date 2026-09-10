import { MockBlockchainProvider } from "@/lib/blockchain/mock-provider";
import type { BlockchainProvider } from "@/lib/blockchain/types";
import { getServerEnv } from "@/lib/env";

/**
 * The server-side anchoring provider.
 *
 * Only simulation mode has one. In real mode the proof is signed by the issuing
 * organization's own wallet in the browser and the server merely confirms the
 * result against the chain, so there is deliberately nothing here that could
 * sign on a user's behalf — the server holds no private key.
 */
export function getBlockchainProvider(): BlockchainProvider {
  const mode = getServerEnv().BLOCKCHAIN_MODE;

  if (mode === "real") {
    throw new Error(
      "Real-mode proofs are signed by the organization's wallet; the server does not anchor them.",
    );
  }

  return new MockBlockchainProvider();
}
