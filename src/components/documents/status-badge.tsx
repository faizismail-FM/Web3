import type { DocumentStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_TONES,
} from "@/lib/documents/types";
import { cn } from "@/lib/utils";

const TONE_CLASSES = {
  neutral: "border-border bg-muted text-muted-foreground",
  pending: "border-warning/40 bg-warning-muted text-warning-muted-foreground",
  success: "border-success/40 bg-success-muted text-success-muted-foreground",
  destructive:
    "border-destructive/40 bg-destructive-muted text-destructive-muted-foreground",
} as const;

export function DocumentStatusBadge({
  status,
  className,
}: {
  status: DocumentStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        TONE_CLASSES[DOCUMENT_STATUS_TONES[status]],
        className,
      )}
    >
      {DOCUMENT_STATUS_LABELS[status]}
    </Badge>
  );
}
