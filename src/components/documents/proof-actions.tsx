"use client";

import dynamic from "next/dynamic";

import { RegisterProofButton } from "@/components/documents/register-proof-button";
import { Skeleton } from "@/components/ui/skeleton";
import { publicEnv } from "@/lib/env";

/**
 * Wallet code is loaded only when the deployment actually anchors on a chain,
 * so a simulation-mode install never ships wagmi to the browser.
 */
const WalletProofSection = dynamic(
  () =>
    import("@/components/blockchain/wallet-proof-section").then(
      (module) => module.WalletProofSection,
    ),
  { ssr: false, loading: () => <Skeleton className="h-40 w-full" /> },
);

export function ProofActions({
  documentId,
  filename,
  sha256Hash,
  retry = false,
}: {
  documentId: string;
  filename: string;
  sha256Hash: string;
  retry?: boolean;
}) {
  if (publicEnv.blockchainMode !== "real") {
    return <RegisterProofButton documentId={documentId} retry={retry} />;
  }

  return (
    <WalletProofSection
      documentId={documentId}
      filename={filename}
      sha256Hash={sha256Hash}
    />
  );
}
