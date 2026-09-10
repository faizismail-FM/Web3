"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Field } from "@/components/auth/field";
import { FormError } from "@/components/auth/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api/client";
import { updateOrganizationSchema } from "@/lib/validation/organizations";

export function OrganizationForm({
  defaults,
  canEdit,
}: {
  defaults: {
    name: string;
    registrationNumber: string;
    email: string;
    walletAddress: string;
  };
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const parsed = updateOrganizationSchema.safeParse({
      name: formData.get("name"),
      registrationNumber: formData.get("registrationNumber"),
      email: formData.get("email"),
      walletAddress: formData.get("walletAddress"),
    });

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setPending(true);
    const { error } = await apiFetch("/api/organizations/current", {
      method: "PATCH",
      body: JSON.stringify(parsed.data),
    });
    setPending(false);

    if (error) {
      setFormError(error.message);
      setFieldErrors(error.fields);
      return;
    }

    toast.success("Organization updated");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormError message={formError} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="org-name" label="Organization name" error={fieldErrors.name}>
          <Input
            id="org-name"
            name="name"
            defaultValue={defaults.name}
            disabled={!canEdit || pending}
            required
          />
        </Field>

        <Field
          id="org-registration"
          label="Registration number"
          error={fieldErrors.registrationNumber}
        >
          <Input
            id="org-registration"
            name="registrationNumber"
            defaultValue={defaults.registrationNumber}
            placeholder="202301012345"
            disabled={!canEdit || pending}
          />
        </Field>

        <Field id="org-email" label="Contact email" error={fieldErrors.email}>
          <Input
            id="org-email"
            name="email"
            type="email"
            defaultValue={defaults.email}
            placeholder="operations@company.com"
            disabled={!canEdit || pending}
          />
        </Field>

        <Field
          id="org-wallet"
          label="Organization wallet"
          error={fieldErrors.walletAddress}
          hint="Optional. Used as the default issuer for blockchain proofs."
        >
          <Input
            id="org-wallet"
            name="walletAddress"
            defaultValue={defaults.walletAddress}
            placeholder="0x0000000000000000000000000000000000000000"
            className="font-mono text-sm"
            disabled={!canEdit || pending}
          />
        </Field>
      </div>

      {canEdit ? (
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Saving
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Only owners and admins can change these details.
        </p>
      )}
    </form>
  );
}
