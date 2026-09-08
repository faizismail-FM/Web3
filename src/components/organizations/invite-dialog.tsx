"use client";

import { MemberRole } from "@prisma/client";
import { Loader2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Field } from "@/components/auth/field";
import { FormError } from "@/components/auth/form-error";
import { CopyButton } from "@/components/common/copy-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api/client";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/auth/rbac";

const ASSIGNABLE_ROLES = [
  MemberRole.ADMIN,
  MemberRole.MEMBER,
  MemberRole.VIEWER,
] as const;

/**
 * Creates an invitation and shows the resulting link.
 *
 * There is no email delivery yet, so the link is displayed once for the
 * inviter to pass on themselves. The token is not stored in recoverable form,
 * so it genuinely cannot be shown again.
 */
export function InviteDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [role, setRole] = useState<MemberRole>(MemberRole.MEMBER);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  function reset() {
    setInviteUrl(null);
    setFormError(null);
    setFieldErrors({});
    setRole(MemberRole.MEMBER);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const email = String(
      new FormData(event.currentTarget).get("email") ?? "",
    ).trim();

    setPending(true);
    const { data, error } = await apiFetch<{ token: string }>(
      "/api/organizations/current/invitations",
      { method: "POST", body: JSON.stringify({ email, role }) },
    );
    setPending(false);

    if (error) {
      setFormError(error.message);
      setFieldErrors(error.fields);
      return;
    }

    setInviteUrl(
      `${window.location.origin}/register?invite=${encodeURIComponent(data.token)}`,
    );
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="size-4" aria-hidden="true" />
          Invite member
        </Button>
      </DialogTrigger>

      <DialogContent>
        {inviteUrl ? (
          <>
            <DialogHeader>
              <DialogTitle>Invitation ready</DialogTitle>
              <DialogDescription>
                Send this link to the person you are inviting. It expires in
                seven days and can only be used once.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="rounded-md border bg-muted/40 p-3">
                <code className="hash-text text-xs">{inviteUrl}</code>
              </div>
              <p className="text-xs text-muted-foreground">
                This link is shown only once and cannot be recovered later. If
                you lose it, create a new invitation.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={reset}>
                Invite someone else
              </Button>
              <CopyButton
                value={inviteUrl}
                label="Copy link"
                copiedLabel="Link copied"
                variant="secondary"
              />
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <DialogHeader>
              <DialogTitle>Invite a colleague</DialogTitle>
              <DialogDescription>
                They will join this organization when they accept.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <FormError message={formError} />

              <Field
                id="invite-email"
                label="Email address"
                error={fieldErrors.email}
                hint="Optional. If set, only this address can accept the invitation."
              >
                <Input
                  id="invite-email"
                  name="email"
                  type="email"
                  placeholder="colleague@company.com"
                />
              </Field>

              <Field id="invite-role" label="Role">
                <Select
                  value={role}
                  onValueChange={(value) => setRole(value as MemberRole)}
                >
                  <SelectTrigger id="invite-role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSIGNABLE_ROLES.map((option) => (
                      <SelectItem key={option} value={option}>
                        {ROLE_LABELS[option]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {ROLE_DESCRIPTIONS[role]}
                </p>
              </Field>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Creating invitation
                  </>
                ) : (
                  "Create invitation"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
