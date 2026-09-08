import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AuthFormShell } from "@/components/auth/auth-form-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { Skeleton } from "@/components/ui/skeleton";
import { findUsableInvitation } from "@/lib/services/invitations";

export const metadata: Metadata = {
  title: "Create an account",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;

  // An expired or revoked link falls back to normal sign-up rather than an
  // error page — the visitor can still create their own workspace.
  const invitation = invite ? await findUsableInvitation(invite) : null;
  const organizationName = invitation?.organization.name ?? null;

  return (
    <AuthFormShell
      title={organizationName ? `Join ${organizationName}` : "Create your workspace"}
      description={
        organizationName
          ? "You have been invited to register documents with this organization."
          : "Start registering documents in a few minutes. No wallet required."
      }
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      {/* useSearchParams requires a Suspense boundary during prerendering. */}
      <Suspense fallback={<Skeleton className="h-72 w-full" />}>
        <RegisterForm invitedOrganization={organizationName} />
      </Suspense>
    </AuthFormShell>
  );
}
