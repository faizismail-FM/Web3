"use client";

import { Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Field } from "@/components/auth/field";
import { FormError } from "@/components/auth/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api/client";
import { registerSchema } from "@/lib/validation/auth";

export function RegisterForm({
  invitedOrganization,
}: {
  invitedOrganization: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invitationToken = searchParams.get("invite") ?? "";
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const values = {
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      organizationName: formData.get("organizationName") ?? "",
      invitationToken,
    };

    const parsed = registerSchema.safeParse(values);
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
    const { error } = await apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });

    if (error) {
      setPending(false);
      setFormError(error.message);
      setFieldErrors(error.fields);
      return;
    }

    // Sign the new user straight in — asking them to retype credentials they
    // just chose is friction with no security benefit.
    const signInResult = await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
    setPending(false);

    if (!signInResult || signInResult.error) {
      router.push("/login");
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormError message={formError} />

      <Field id="name" label="Full name" error={fieldErrors.name}>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          placeholder="Aisyah Rahman"
          required
          aria-invalid={Boolean(fieldErrors.name)}
        />
      </Field>

      <Field id="email" label="Work email" error={fieldErrors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          required
          aria-invalid={Boolean(fieldErrors.email)}
        />
      </Field>

      {invitationToken ? null : (
        <Field
          id="organizationName"
          label="Organization"
          error={fieldErrors.organizationName}
          hint="You can invite colleagues once your workspace is created."
        >
          <Input
            id="organizationName"
            name="organizationName"
            autoComplete="organization"
            placeholder="FM Global Logistics"
            required
            aria-invalid={Boolean(fieldErrors.organizationName)}
          />
        </Field>
      )}

      <Field
        id="password"
        label="Password"
        error={fieldErrors.password}
        hint="At least 10 characters, with upper and lower case letters and a number."
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={Boolean(fieldErrors.password)}
        />
      </Field>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            {invitedOrganization ? "Joining" : "Creating your workspace"}
          </>
        ) : invitedOrganization ? (
          "Join organization"
        ) : (
          "Create account"
        )}
      </Button>
    </form>
  );
}
