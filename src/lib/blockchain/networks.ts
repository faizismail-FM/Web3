/**
 * Networks ProofChain can anchor proofs to.
 *
 * Only Base Sepolia is configured for now. The explorer URL matters for the
 * product, not just for developers: "View on blockchain explorer" is how a
 * sceptical counterparty checks the proof against a source that is not us.
 */
export type NetworkConfig = {
  chainId: number;
  name: string;
  explorerBaseUrl: string;
  isTestnet: boolean;
};

export const BASE_SEPOLIA: NetworkConfig = {
  chainId: 84532,
  name: "Base Sepolia",
  explorerBaseUrl: "https://sepolia.basescan.org",
  isTestnet: true,
};

export const NETWORKS_BY_CHAIN_ID: Record<number, NetworkConfig> = {
  [BASE_SEPOLIA.chainId]: BASE_SEPOLIA,
};

export function networkForChainId(
  chainId: number | null | undefined,
): NetworkConfig | null {
  if (chainId == null) return null;
  return NETWORKS_BY_CHAIN_ID[chainId] ?? null;
}

export function transactionUrl(
  chainId: number | null | undefined,
  transactionHash: string,
): string | null {
  const network = networkForChainId(chainId);
  if (!network) return null;
  return `${network.explorerBaseUrl}/tx/${transactionHash}`;
}

export function addressUrl(
  chainId: number | null | undefined,
  address: string,
): string | null {
  const network = networkForChainId(chainId);
  if (!network) return null;
  return `${network.explorerBaseUrl}/address/${address}`;
}
