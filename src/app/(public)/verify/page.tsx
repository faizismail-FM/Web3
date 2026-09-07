import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/common/empty-state";

export const metadata: Metadata = {
  title: "Verify a document",
};

export default function VerifyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Verify a document
        </h1>
        <p className="text-muted-foreground">
          Check whether a document matches a registered proof. You do not need
          an account.
        </p>
      </div>

      <div className="mt-10">
        <EmptyState
          icon={ShieldCheck}
          title="Verification is coming next"
          description="Upload-based verification and verification-ID lookup are built in a later phase of this project."
        />
      </div>
    </div>
  );
}
