"use client";

import { WalletProofFlow } from "@/components/blockchain/wallet-proof-flow";
import { WalletProvider } from "@/components/blockchain/wallet-provider";

/** Pairs the wallet provider with the flow so both load in one dynamic chunk. */
export function WalletProofSection(props: {
  documentId: string;
  filename: string;
  sha256Hash: string;
}) {
  return (
    <WalletProvider>
      <WalletProofFlow {...props} />
    </WalletProvider>
  );
}
