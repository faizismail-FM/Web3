import type { ActivityType } from "@prisma/client";
import {
  CheckCircle2,
  Circle,
  FileUp,
  Fingerprint,
  Link2,
  ShieldAlert,
  ShieldCheck,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { formatDateTime, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const ICONS: Partial<Record<ActivityType, LucideIcon>> = {
  DOCUMENT_UPLOADED: FileUp,
  HASH_GENERATED: Fingerprint,
  BLOCKCHAIN_REGISTRATION_STARTED: Link2,
  BLOCKCHAIN_REGISTRATION_COMPLETED: CheckCircle2,
  BLOCKCHAIN_REGISTRATION_FAILED: XCircle,
  DOCUMENT_VERIFIED: ShieldCheck,
  VERIFICATION_FAILED: ShieldAlert,
};

const TONES: Partial<Record<ActivityType, string>> = {
  BLOCKCHAIN_REGISTRATION_COMPLETED: "text-success",
  DOCUMENT_VERIFIED: "text-success",
  BLOCKCHAIN_REGISTRATION_FAILED: "text-destructive",
  VERIFICATION_FAILED: "text-destructive",
};

export type TimelineEntry = {
  id: string;
  type: ActivityType;
  message: string;
  createdAt: Date;
  actor: string | null;
};

export function ActivityTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing has happened to this document yet.
      </p>
    );
  }

  return (
    <ol className="space-y-5">
      {entries.map((entry, index) => {
        const Icon = ICONS[entry.type] ?? Circle;
        return (
          <li key={entry.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  TONES[entry.type] ?? "text-muted-foreground",
                )}
                aria-hidden="true"
              />
              {index < entries.length - 1 ? (
                <span className="mt-1 w-px flex-1 bg-border" aria-hidden="true" />
              ) : null}
            </div>

            <div className="min-w-0 pb-1">
              <p className="text-sm">{entry.message}</p>
              <p className="tabular text-xs text-muted-foreground">
                <time dateTime={new Date(entry.createdAt).toISOString()}>
                  {formatRelativeTime(entry.createdAt)}
                </time>
                {" · "}
                {formatDateTime(entry.createdAt)}
                {entry.actor ? ` · ${entry.actor}` : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
