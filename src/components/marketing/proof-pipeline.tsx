import { ArrowDown, FileText, Fingerprint, Link2, ShieldCheck } from "lucide-react";

const STAGES = [
  {
    icon: FileText,
    label: "Document",
    detail: "Stored securely in your workspace",
  },
  {
    icon: Fingerprint,
    label: "SHA-256 hash",
    detail: "A unique fingerprint, computed on our servers",
  },
  {
    icon: Link2,
    label: "Blockchain proof",
    detail: "Only the fingerprint is published",
  },
  {
    icon: ShieldCheck,
    label: "Verification",
    detail: "Anyone can confirm the document is unchanged",
  },
];

/**
 * The workflow visualization. Laid out as a column on narrow screens and a row
 * on wide ones, with the connector arrows rotating to match.
 */
export function ProofPipeline() {
  return (
    <ol className="flex flex-col items-stretch gap-2 lg:flex-row lg:items-center">
      {STAGES.map((stage, index) => (
        <li
          key={stage.label}
          className="flex flex-col items-stretch gap-2 lg:flex-1 lg:flex-row lg:items-center"
        >
          <div className="flex-1 rounded-lg border bg-card p-5">
            <stage.icon
              className="size-5 text-primary"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm font-medium">{stage.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{stage.detail}</p>
          </div>

          {index < STAGES.length - 1 ? (
            <ArrowDown
              className="mx-auto size-4 shrink-0 text-muted-foreground lg:mx-2 lg:-rotate-90"
              aria-hidden="true"
            />
          ) : null}
        </li>
      ))}
    </ol>
  );
}
