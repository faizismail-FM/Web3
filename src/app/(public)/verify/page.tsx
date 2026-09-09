import type { Metadata } from "next";

import { VerifyUploadForm } from "@/components/verification/verify-upload-form";
import { getServerEnv } from "@/lib/env";
import { normalizeVerificationId } from "@/lib/verification/id";

export const metadata: Metadata = {
  title: "Verify a document",
};

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const prefilled = id ? (normalizeVerificationId(id) ?? "") : "";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Verify a document
        </h1>
        <p className="text-muted-foreground">
          Upload a document to check whether it matches a registered proof. You
          do not need an account, a wallet, or any knowledge of blockchain
          technology.
        </p>
      </div>

      <div className="mt-10">
        <VerifyUploadForm
          maxBytes={getServerEnv().MAX_UPLOAD_BYTES}
          defaultVerificationId={prefilled}
        />
      </div>
    </div>
  );
}
