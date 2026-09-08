"use client";

import type { MemberRole } from "@prisma/client";
import { Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { ROLE_LABELS } from "@/lib/auth/rbac";
import { formatDate } from "@/lib/format";

export type PendingInvitationRow = {
  id: string;
  email: string | null;
  role: MemberRole;
  expiresAt: string;
  invitedBy: string;
};

export function PendingInvitations({
  invitations,
}: {
  invitations: PendingInvitationRow[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (invitations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No pending invitations.
      </p>
    );
  }

  async function revoke(id: string) {
    setBusyId(id);
    const { error } = await apiFetch(
      `/api/organizations/current/invitations/${id}`,
      { method: "DELETE" },
    );
    setBusyId(null);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Invitation revoked");
    router.refresh();
  }

  return (
    <ul className="divide-y rounded-lg border">
      {invitations.map((invitation) => (
        <li
          key={invitation.id}
          className="flex items-center justify-between gap-4 px-4 py-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {invitation.email ?? "Anyone with the link"}
            </p>
            <p className="tabular text-xs text-muted-foreground">
              Invited by {invitation.invitedBy} · expires{" "}
              {formatDate(invitation.expiresAt)}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="secondary">{ROLE_LABELS[invitation.role]}</Badge>
            <Button
              variant="ghost"
              size="icon"
              disabled={busyId === invitation.id}
              onClick={() => revoke(invitation.id)}
              aria-label="Revoke invitation"
            >
              {busyId === invitation.id ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <X className="size-4 text-muted-foreground" aria-hidden="true" />
              )}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
