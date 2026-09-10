import { ExternalLink } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { addressUrl, BASE_SEPOLIA } from "@/lib/blockchain/networks";
import { truncateHex } from "@/lib/format";
import type { BlockchainStatus } from "@/lib/services/dashboard";
import { cn } from "@/lib/utils";

const CONNECTION_COPY: Record<
  BlockchainStatus["connection"],
  { label: string; tone: string; detail: string }
> = {
  connected: {
    label: "Connected",
    tone: "bg-success",
    detail: "Proofs are anchored on a public network.",
  },
  simulated: {
    label: "Simulation",
    tone: "bg-warning",
    detail:
      "Proofs are simulated for development and are not on a public network.",
  },
  unreachable: {
    label: "Unreachable",
    tone: "bg-destructive",
    detail:
      "The network is configured but did not respond. New proofs will fail.",
  },
  unconfigured: {
    label: "Not configured",
    tone: "bg-destructive",
    detail: "Set a contract address and RPC endpoint to anchor proofs.",
  },
};

export function BlockchainStatusCard({ status }: { status: BlockchainStatus }) {
  const copy = CONNECTION_COPY[status.connection];
  const explorer = status.contractAddress
    ? addressUrl(BASE_SEPOLIA.chainId, status.contractAddress)
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Blockchain</CardTitle>
        <CardDescription>{copy.detail}</CardDescription>
      </CardHeader>

      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">Network</dt>
            <dd className="text-sm font-medium">{status.networkName}</dd>
          </div>

          <div>
            <dt className="text-sm text-muted-foreground">Network status</dt>
            <dd className="flex items-center gap-2 text-sm font-medium">
              <span
                className={cn("size-2 shrink-0 rounded-full", copy.tone)}
                aria-hidden="true"
              />
              {copy.label}
            </dd>
          </div>

          <div className="min-w-0">
            <dt className="text-sm text-muted-foreground">Contract</dt>
            <dd className="text-sm font-medium">
              {status.contractAddress ? (
                explorer ? (
                  <a
                    href={explorer}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                  >
                    <span className="hash-text">
                      {truncateHex(status.contractAddress, 8, 6)}
                    </span>
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                  </a>
                ) : (
                  <span className="hash-text">
                    {truncateHex(status.contractAddress, 8, 6)}
                  </span>
                )
              ) : (
                "—"
              )}
            </dd>
          </div>

          <div>
            <dt className="text-sm text-muted-foreground">
              {status.blockNumber ? "Latest block" : "Proofs recorded"}
            </dt>
            <dd className="tabular text-sm font-medium">
              {status.blockNumber ?? status.proofsRecorded.toLocaleString()}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
