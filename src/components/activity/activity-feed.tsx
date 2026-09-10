import type { ActivityType } from "@prisma/client";
import {
  Building2,
  CheckCircle2,
  Circle,
  FileUp,
  Fingerprint,
  Link2,
  ShieldAlert,
  ShieldCheck,
  UserMinus,
  UserPlus,
  Wallet,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { formatDateTime, formatRelativeTime } from "@/lib/format";
import type { ActivityEntry } from "@/lib/services/activity";
import { cn } from "@/lib/utils";

const ICONS: Record<ActivityType, LucideIcon> = {
  DOCUMENT_UPLOADED: FileUp,
  HASH_GENERATED: Fingerprint,
  BLOCKCHAIN_REGISTRATION_STARTED: Link2,
  BLOCKCHAIN_REGISTRATION_COMPLETED: CheckCircle2,
  BLOCKCHAIN_REGISTRATION_FAILED: XCircle,
  DOCUMENT_VERIFIED: ShieldCheck,
  VERIFICATION_FAILED: ShieldAlert,
  WALLET_CONNECTED: Wallet,
  USER_REGISTERED: UserPlus,
  ORGANIZATION_CREATED: Building2,
  MEMBER_INVITED: UserPlus,
  MEMBER_ROLE_CHANGED: Circle,
  MEMBER_REMOVED: UserMinus,
};

const TONES: Partial<Record<ActivityType, string>> = {
  BLOCKCHAIN_REGISTRATION_COMPLETED: "text-success",
  DOCUMENT_VERIFIED: "text-success",
  BLOCKCHAIN_REGISTRATION_FAILED: "text-destructive",
  VERIFICATION_FAILED: "text-destructive",
};

/**
 * The organization-wide audit trail. Each entry links to the document it
 * concerns where there is one, so the log is a way into the data rather than
 * just a record of it.
 */
export function ActivityFeed({ entries }: { entries: ActivityEntry[] }) {
  return (
    <ul className="divide-y rounded-lg border">
      {entries.map((entry) => {
        const Icon = ICONS[entry.type] ?? Circle;

        return (
          <li key={entry.id} className="flex items-start gap-3 px-4 py-3.5">
            <Icon
              className={cn(
                "mt-0.5 size-4 shrink-0",
                TONES[entry.type] ?? "text-muted-foreground",
              )}
              aria-hidden="true"
            />

            {/* The link sits beside the text on wide screens and below it on
                narrow ones, where side-by-side would squeeze both. */}
            <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <p className="text-sm">{entry.message}</p>
                <p className="tabular text-xs text-muted-foreground">
                  <time dateTime={new Date(entry.createdAt).toISOString()}>
                    {formatRelativeTime(entry.createdAt)}
                  </time>
                  {" · "}
                  {formatDateTime(entry.createdAt)}
                  {entry.user ? ` · ${entry.user.name}` : ""}
                </p>
              </div>

              {entry.document ? (
                <Link
                  href={`/documents/${entry.document.id}`}
                  className="shrink-0 text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  View document
                </Link>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
