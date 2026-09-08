"use client";

import { MemberRole } from "@prisma/client";
import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { initialsOf } from "@/components/layout/user-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/api/client";
import { ROLE_LABELS } from "@/lib/auth/rbac";
import { formatDate } from "@/lib/format";

export type MemberRow = {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: MemberRole;
  joinedAt: string;
};

const ASSIGNABLE_ROLES = [
  MemberRole.ADMIN,
  MemberRole.MEMBER,
  MemberRole.VIEWER,
] as const;

export function MembersTable({
  members,
  canManage,
  currentUserId,
}: {
  members: MemberRow[];
  canManage: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function changeRole(membershipId: string, role: MemberRole) {
    setBusyId(membershipId);
    const { error } = await apiFetch(
      `/api/organizations/current/members/${membershipId}`,
      { method: "PATCH", body: JSON.stringify({ role }) },
    );
    setBusyId(null);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Role updated");
    router.refresh();
  }

  async function remove(membershipId: string, name: string) {
    setBusyId(membershipId);
    const { error } = await apiFetch(
      `/api/organizations/current/members/${membershipId}`,
      { method: "DELETE" },
    );
    setBusyId(null);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${name} was removed`);
    router.refresh();
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead>Member</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            {canManage ? (
              <TableHead className="text-right">Actions</TableHead>
            ) : null}
          </TableRow>
        </TableHeader>

        <TableBody>
          {members.map((member) => {
            const isSelf = member.userId === currentUserId;
            const isOwner = member.role === MemberRole.OWNER;
            // Owners and your own membership are never editable from here —
            // the server enforces the same rule.
            const editable = canManage && !isSelf && !isOwner;
            const busy = busyId === member.membershipId;

            return (
              <TableRow key={member.membershipId}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-primary/10 text-[11px] font-medium text-primary">
                        {initialsOf(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {member.name}
                        {isSelf ? (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            You
                          </span>
                        ) : null}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {member.email}
                      </p>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  {editable ? (
                    <Select
                      value={member.role}
                      disabled={busy}
                      onValueChange={(value) =>
                        changeRole(member.membershipId, value as MemberRole)
                      }
                    >
                      <SelectTrigger
                        className="w-36"
                        aria-label={`Role for ${member.name}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSIGNABLE_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary">{ROLE_LABELS[member.role]}</Badge>
                  )}
                </TableCell>

                <TableCell className="tabular whitespace-nowrap text-muted-foreground">
                  {formatDate(member.joinedAt)}
                </TableCell>

                {canManage ? (
                  <TableCell className="text-right">
                    {editable ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={busy}
                            aria-label={`Remove ${member.name}`}
                          >
                            {busy ? (
                              <Loader2
                                className="size-4 animate-spin"
                                aria-hidden="true"
                              />
                            ) : (
                              <Trash2
                                className="size-4 text-muted-foreground"
                                aria-hidden="true"
                              />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Remove {member.name}?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              They will immediately lose access to this
                              organization&apos;s documents. Documents they
                              uploaded are not deleted.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                remove(member.membershipId, member.name)
                              }
                            >
                              Remove member
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : null}
                  </TableCell>
                ) : null}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
