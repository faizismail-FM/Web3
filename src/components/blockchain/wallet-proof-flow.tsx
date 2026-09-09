"use client";

import { Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";

import { WalletConnect } from "@/components/blockchain/wallet-connect";
import {
  TransactionSteps,
  type FlowState,
} from "@/components/blockchain/transaction-steps";
import { HashDisplay } from "@/components/documents/hash-display";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { PROOF_CHAIN_REGISTRY_ABI } from "@/lib/blockchain/abi";
import { TARGET_CHAIN } from "@/lib/blockchain/wagmi";
import { truncateHex } from "@/lib/format";

type Prepared = {
  verificationId: string;
  documentHash: `0x${string}`;
  contractAddress: `0x${string}`;
  chainId: number;
  networkName: string;
  filename: string;
  sha256Hash: string;
};

/**
 * Wallet-signed proof creation.
 *
 * The organization's own wallet signs; the server never holds a key. Once the
 * transaction is mined, the server independently re-reads it from the chain
 * before recording anything, so a proof always reflects what actually happened
 * rather than what the browser reported.
 */
export function WalletProofFlow({
  documentId,
  filename,
  sha256Hash,
}: {
  documentId: string;
  filename: string;
  sha256Hash: string;
}) {
  const router = useRouter();
  const { address, isConnected, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [state, setState] = useState<FlowState>({ phase: "idle" });

  const ready = isConnected && chainId === TARGET_CHAIN.id;
  const running = state.phase === "running";

  async function createProof() {
    setState({ phase: "running", stage: "preparing" });

    const { data, error } = await apiFetch<{ prepared: Prepared }>(
      `/api/documents/${documentId}/register/prepare`,
      { method: "POST" },
    );

    if (error) {
      setState({ phase: "failed", stage: "preparing", message: error.message });
      return;
    }

    const prepared = data.prepared;
    let transactionHash: `0x${string}`;

    try {
      setState({ phase: "running", stage: "approving" });
      transactionHash = await writeContractAsync({
        abi: PROOF_CHAIN_REGISTRY_ABI,
        address: prepared.contractAddress,
        functionName: "registerDocument",
        args: [prepared.documentHash, prepared.verificationId],
        chainId: TARGET_CHAIN.id,
      });
    } catch (cause) {
      // A user declining in their wallet is an ordinary outcome, not an error
      // to apologise for.
      const declined =
        cause instanceof Error && /user rejected|denied/i.test(cause.message);
      setState({
        phase: "failed",
        stage: "approving",
        message: declined
          ? "You declined the request in your wallet. Nothing was registered."
          : "The transaction could not be sent. Please try again.",
      });
      return;
    }

    setState({ phase: "running", stage: "submitted" });

    try {
      setState({ phase: "running", stage: "confirming" });
      await publicClient?.waitForTransactionReceipt({ hash: transactionHash });
    } catch {
      setState({
        phase: "failed",
        stage: "confirming",
        message:
          "The transaction was submitted but could not be confirmed. It may still succeed — refresh in a moment.",
      });
      return;
    }

    const confirmation = await apiFetch(
      `/api/documents/${documentId}/register/confirm`,
      { method: "POST", body: JSON.stringify({ transactionHash }) },
    );

    if (confirmation.error) {
      setState({
        phase: "failed",
        stage: "confirming",
        message: confirmation.error.message,
      });
      return;
    }

    setState({ phase: "done" });
    toast.success("Blockchain proof created");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <WalletConnect />

      {ready ? (
        <>
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="mb-3 text-sm font-medium">
              What will be published
            </p>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">Document</dt>
                <dd className="truncate text-sm">{filename}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">Network</dt>
                <dd className="text-sm">{TARGET_CHAIN.name}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">
                  SHA-256 fingerprint
                </dt>
                <dd>
                  <HashDisplay hash={sha256Hash} />
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">Wallet</dt>
                <dd className="hash-text text-sm">
                  {truncateHex(address ?? "", 6, 4)}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              Only the fingerprint above is published. The document itself never
              leaves your workspace.
            </p>
          </div>

          {state.phase !== "idle" ? (
            <div className="rounded-lg border p-4">
              <TransactionSteps state={state} />
            </div>
          ) : null}

          {state.phase !== "done" ? (
            <Button onClick={createProof} disabled={running}>
              {running ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Creating proof
                </>
              ) : (
                <>
                  <ShieldCheck className="size-4" aria-hidden="true" />
                  {state.phase === "failed"
                    ? "Try again"
                    : "Create blockchain proof"}
                </>
              )}
            </Button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
