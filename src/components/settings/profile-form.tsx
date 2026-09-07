"use client";

import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Field } from "@/components/auth/field";
import { FormError } from "@/components/auth/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api/client";
import { updateProfileSchema } from "@/lib/validation/auth";

export function ProfileForm({
  defaultName,
  defaultWalletAddress,
}: {
  defaultName: string;
  defaultWalletAddress: string;
}) {
  const router = useRouter();
  const { update } = useSession();
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const parsed = updateProfileSchema.safeParse({
      name: formData.get("name"),
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
    const { error } = await apiFetch("/api/profile", {
      method: "PATCH",
      body: JSON.stringify(parsed.data),
    });
    setPending(false);

    if (error) {
      setFormError(error.message);
      setFieldErrors(error.fields);
      return;
    }

    toast.success("Profile updated");
    await update();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormError message={formError} />

      <Field id="profile-name" label="Full name" error={fieldErrors.name}>
        <Input
          id="profile-name"
          name="name"
          defaultValue={defaultName}
          autoComplete="name"
          required
          aria-invalid={Boolean(fieldErrors.name)}
        />
      </Field>

      <Field
        id="profile-wallet"
        label="Wallet address"
        error={fieldErrors.walletAddress}
        hint="Optional. Only needed if you want to sign blockchain proofs yourself."
      >
        <Input
          id="profile-wallet"
          name="walletAddress"
          defaultValue={defaultWalletAddress}
          placeholder="0x0000000000000000000000000000000000000000"
          className="font-mono text-sm"
          aria-invalid={Boolean(fieldErrors.walletAddress)}
        />
      </Field>

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
    </form>
  );
}
