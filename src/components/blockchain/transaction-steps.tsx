import { Check, Loader2, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The five stages a registration passes through, as named in the product spec.
 *
 * They are shown because a blockchain transaction has a genuinely slow middle:
 * without visible progress, "waiting for wallet approval" is indistinguishable
 * from "broken".
 */
export const TRANSACTION_STAGES = [
  { key: "preparing", label: "Preparing transaction" },
  { key: "approving", label: "Waiting for wallet approval" },
  { key: "submitted", label: "Transaction submitted" },
  { key: "confirming", label: "Confirming on the blockchain" },
  { key: "registered", label: "Successfully registered" },
] as const;

export type TransactionStage = (typeof TRANSACTION_STAGES)[number]["key"];

export type FlowState =
  | { phase: "idle" }
  | { phase: "running"; stage: TransactionStage }
  | { phase: "failed"; stage: TransactionStage; message: string }
  | { phase: "done" };

function stageIndex(stage: TransactionStage): number {
  return TRANSACTION_STAGES.findIndex((entry) => entry.key === stage);
}

export function TransactionSteps({ state }: { state: FlowState }) {
  if (state.phase === "idle") return null;

  const currentIndex =
    state.phase === "done"
      ? TRANSACTION_STAGES.length
      : stageIndex(state.stage);

  return (
    <ol className="space-y-3" aria-live="polite">
      {TRANSACTION_STAGES.map((stage, index) => {
        const complete = index < currentIndex;
        const active = index === currentIndex && state.phase === "running";
        const failed = index === currentIndex && state.phase === "failed";

        return (
          <li key={stage.key} className="flex items-center gap-3">
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full border",
                complete && "border-success bg-success text-success-foreground",
                active && "border-primary text-primary",
                failed && "border-destructive bg-destructive text-white",
                !complete && !active && !failed && "border-border",
              )}
            >
              {complete ? (
                <Check className="size-3" aria-hidden="true" />
              ) : active ? (
                <Loader2 className="size-3 animate-spin" aria-hidden="true" />
              ) : failed ? (
                <X className="size-3" aria-hidden="true" />
              ) : null}
            </span>

            <span
              className={cn(
                "text-sm",
                complete && "text-muted-foreground",
                active && "font-medium",
                failed && "font-medium text-destructive",
                !complete && !active && !failed && "text-muted-foreground/60",
              )}
            >
              {stage.label}
            </span>
          </li>
        );
      })}

      {state.phase === "failed" ? (
        <li role="alert" className="pt-1 text-sm font-medium text-destructive">
          {state.message}
        </li>
      ) : null}
    </ol>
  );
}
