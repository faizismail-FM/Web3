import { VerificationMethod } from "@prisma/client";
import { FileSearch, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { CheckList } from "@/components/verification/check-list";
import { ProofDetails } from "@/components/verification/proof-details";
import { VerdictBanner } from "@/components/verification/verdict-banner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  findProofByVerificationId,
  recordVerification,
} from "@/lib/services/verification";
import { getCurrentUser } from "@/lib/auth/session";
import { normalizeVerificationId } from "@/lib/verification/id";

export const metadata: Metadata = {
  title: "Verify a document",
  // A verification page is a record, not marketing. Keeping it out of search
  // results avoids turning proof URLs into a browsable index.
  robots: { index: false, follow: false },
};

export default async function PublicVerificationPage({
  params,
}: {
  params: Promise<{ verificationId: string }>;
}) {
  const { verificationId: rawId } = await params;
  const canonical = normalizeVerificationId(rawId);

  const outcome = await findProofByVerificationId(rawId);
  const user = await getCurrentUser();

  await recordVerification({
    outcome,
    method: VerificationMethod.VERIFICATION_ID,
    verifiedBy: user?.id ?? null,
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-8 flex items-center gap-2 text-sm text-muted-foreground">
        <ShieldCheck className="size-4" aria-hidden="true" />
        Document verification
      </div>

      {outcome.status === "verified" ? (
        <div className="space-y-8">
          <VerdictBanner
            verdict="verified"
            title="Document verified"
            description="This document is registered with ProofChain and has not been modified since it was registered."
          >
            <div className="pt-2">
              <CheckList
                checks={[
                  { label: "Document fingerprint matches", passed: true },
                  { label: "Blockchain registration found", passed: true },
                  { label: "Issuer verified", passed: true },
                  { label: "Timestamp confirmed", passed: true },
                ]}
              />
            </div>
          </VerdictBanner>

          {outcome.proof.isSimulated ? (
            <Alert className="border-warning/40 bg-warning-muted text-warning-muted-foreground">
              <AlertDescription>
                This proof was created in simulation mode for development. It is
                not anchored on a public blockchain.
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="rounded-xl border bg-card p-6 sm:p-8">
            <h3 className="mb-6 text-base font-medium">Registration record</h3>
            <ProofDetails proof={outcome.proof} />
          </div>

          <p className="text-sm text-muted-foreground">
            Holding a copy of this document? Upload it to confirm your copy is
            the one that was registered.
          </p>

          <Button asChild variant="outline">
            <Link href={`/verify?id=${outcome.proof.verificationId}`}>
              <FileSearch className="size-4" aria-hidden="true" />
              Check my copy
            </Link>
          </Button>
        </div>
      ) : outcome.status === "pending" ? (
        <VerdictBanner
          verdict="pending"
          title="Proof not yet confirmed"
          description={`A registration for ${outcome.verificationId} exists but has not been confirmed on the blockchain. Check again shortly, or contact the organization that issued this document.`}
        />
      ) : (
        <div className="space-y-6">
          <VerdictBanner
            verdict="not_found"
            title="No record for this verification ID"
            description={
              canonical
                ? `We have no registered document with the ID ${canonical}. Check the ID for typing errors, or ask the issuer to confirm it.`
                : "That verification ID is not in a valid format. A ProofChain ID looks like PC-8F29A2."
            }
          />

          <Button asChild variant="outline">
            <Link href="/verify">
              <FileSearch className="size-4" aria-hidden="true" />
              Verify by uploading a document
            </Link>
          </Button>
        </div>
      )}

      <p className="mt-12 border-t pt-6 text-xs text-muted-foreground">
        ProofChain never publishes document contents. Verification compares a
        one-way fingerprint of the file against the record registered by its
        issuer.
      </p>
    </div>
  );
}
