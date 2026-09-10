import { createPublicClient, http, type PublicClient } from "viem";
import { baseSepolia } from "viem/chains";

import { getServerEnv } from "@/lib/env";

/**
 * Read-only chain client used by the server to independently confirm what a
 * transaction actually did.
 *
 * The server never holds a private key and never sends transactions: proofs are
 * signed by the issuing organization's own wallet. This client exists purely to
 * check the chain's account of events against what a client claims.
 */
let cached: PublicClient | null = null;

export function getPublicClient(): PublicClient {
  if (cached) return cached;

  const env = getServerEnv();
  if (!env.BASE_SEPOLIA_RPC_URL) {
    throw new Error("BASE_SEPOLIA_RPC_URL is required when BLOCKCHAIN_MODE=real");
  }

  cached = createPublicClient({
    chain: baseSepolia,
    transport: http(env.BASE_SEPOLIA_RPC_URL),
  }) as PublicClient;

  return cached;
}

/** The deployed registry address, normalised to lowercase for comparison. */
export function getContractAddress(): `0x${string}` {
  const address = getServerEnv().CONTRACT_ADDRESS;
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error("CONTRACT_ADDRESS is not a valid address");
  }
  return address.toLowerCase() as `0x${string}`;
}
