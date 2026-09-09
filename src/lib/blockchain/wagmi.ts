import { createConfig, http } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { coinbaseWallet, injected, metaMask } from "wagmi/connectors";

/**
 * Wallet configuration for the browser.
 *
 * Only Base Sepolia is offered. A wallet on another network is asked to switch
 * before it can sign — a proof anchored on the wrong chain would be worthless.
 */
export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors: [
    injected(),
    metaMask(),
    coinbaseWallet({ appName: "ProofChain" }),
  ],
  transports: {
    [baseSepolia.id]: http(),
  },
  ssr: true,
});

export const TARGET_CHAIN = baseSepolia;

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
