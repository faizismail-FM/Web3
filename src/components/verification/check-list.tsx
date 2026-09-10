import { Check, X } from "lucide-react";

import { cn } from "@/lib/utils";

export type ProofCheck = { label: string; passed: boolean };

/**
 * The individual assertions behind the verdict. Showing them separately makes
 * the claim auditable rather than something the visitor has to take on trust.
 */
export function CheckList({ checks }: { checks: ProofCheck[] }) {
  return (
    <ul className="space-y-2">
      {checks.map((check) => (
        <li key={check.label} className="flex items-center gap-2 text-sm">
          {check.passed ? (
            <Check className="size-4 shrink-0 text-success" aria-hidden="true" />
          ) : (
            <X className="size-4 shrink-0 text-destructive" aria-hidden="true" />
          )}
          <span
            className={cn(
              check.passed ? "text-foreground/80" : "font-medium text-destructive",
            )}
          >
            {check.label}
          </span>
          <span className="sr-only">{check.passed ? "passed" : "failed"}</span>
        </li>
      ))}
    </ul>
  );
}
