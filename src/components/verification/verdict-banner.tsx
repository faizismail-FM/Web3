import { AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Verdict = "verified" | "failed" | "not_found" | "pending";

const STYLES: Record<
  Verdict,
  { icon: typeof CheckCircle2; container: string; icon_: string }
> = {
  verified: {
    icon: CheckCircle2,
    container: "border-success/40 bg-success-muted",
    icon_: "text-success",
  },
  failed: {
    icon: XCircle,
    container: "border-destructive/40 bg-destructive-muted",
    icon_: "text-destructive",
  },
  not_found: {
    icon: AlertTriangle,
    container: "border-warning/40 bg-warning-muted",
    icon_: "text-warning",
  },
  pending: {
    icon: Clock,
    container: "border-warning/40 bg-warning-muted",
    icon_: "text-warning",
  },
};

/**
 * The verdict is the entire message of the public page, so it is stated once,
 * large, with an icon and colour that read correctly at a glance — and never
 * ambiguously. A visitor should not have to interpret anything.
 */
export function VerdictBanner({
  verdict,
  title,
  description,
  children,
}: {
  verdict: Verdict;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  const style = STYLES[verdict];
  const Icon = style.icon;

  return (
    <div
      role="status"
      className={cn("rounded-xl border p-6 sm:p-8", style.container)}
    >
      <div className="flex items-start gap-4">
        <Icon className={cn("mt-0.5 size-8 shrink-0", style.icon_)} aria-hidden="true" />
        <div className="min-w-0 space-y-2">
          <h2 className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">
            {title}
          </h2>
          <p className="text-sm text-foreground/80">{description}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
