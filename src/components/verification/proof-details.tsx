import { ExternalLink } from "lucide-react";

import { HashDisplay } from "@/components/documents/hash-display";
import type { PublicProof } from "@/lib/services/verification";
import { formatDate } from "@/lib/format";
import { truncateHex } from "@/lib/format";

/**
 * The public record behind a proof. Every field here is safe to show to a
 * stranger — no filename, no uploader, no file size.
 */
export function ProofDetails({ proof }: { proof: PublicProof }) {
  const rows: Array<{ label: string; value: React.ReactNode }> = [
    { label: "Document type", value: proof.documentType },
    {
      label: "Verification ID",
      value: <span className="hash-text">{proof.verificationId}</span>,
    },
    { label: "Registered by", value: proof.registeredBy },
    { label: "Registered date", value: formatDate(proof.registeredAt) },
    { label: "Blockchain", value: proof.networkName ?? "—" },
    {
      label: "Transaction",
      value: proof.transactionHash ? (
        proof.transactionUrl ? (
          <a
            href={proof.transactionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
          >
            <span className="hash-text">
              {truncateHex(proof.transactionHash, 10, 8)}
            </span>
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        ) : (
          <span className="hash-text">
            {truncateHex(proof.transactionHash, 10, 8)}
          </span>
        )
      ) : (
        "—"
      ),
    },
    {
      label: "Document fingerprint",
      value: <HashDisplay hash={proof.documentHash} />,
    },
  ];

  return (
    <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="min-w-0">
          <dt className="text-sm text-muted-foreground">{row.label}</dt>
          <dd className="mt-0.5 text-sm font-medium break-words">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
