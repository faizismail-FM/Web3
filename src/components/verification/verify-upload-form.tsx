"use client";

import { Loader2, RotateCcw } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Field } from "@/components/auth/field";
import { FormError } from "@/components/auth/form-error";
import { FileDropzone } from "@/components/documents/file-dropzone";
import { CheckList } from "@/components/verification/check-list";
import { ProofDetails } from "@/components/verification/proof-details";
import { VerdictBanner } from "@/components/verification/verdict-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HashDisplay } from "@/components/documents/hash-display";
import type { VerificationOutcome } from "@/lib/services/verification";

type Response = { outcome: VerificationOutcome; submittedHash: string };

export function VerifyUploadForm({
  maxBytes,
  defaultVerificationId = "",
}: {
  maxBytes: number;
  defaultVerificationId?: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [verificationId, setVerificationId] = useState(defaultVerificationId);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Response | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!file) {
      setError("Choose a document to verify.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    if (verificationId.trim()) {
      formData.append("verificationId", verificationId.trim());
    }

    setPending(true);
    try {
      const response = await fetch("/api/verify/upload", {
        method: "POST",
        body: formData,
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        setError(
          body?.error?.message ??
            "The document could not be checked. Please try again.",
        );
        return;
      }

      setResult(body.data);
    } catch {
      setError("Could not reach the server. Check your connection and retry.");
    } finally {
      setPending(false);
    }
  }

  function reset() {
    setResult(null);
    setFile(null);
    setError(null);
  }

  if (result) {
    return (
      <VerifyResult
        response={result}
        submittedVerificationId={verificationId.trim() || null}
        onReset={reset}
      />
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <FormError message={error} />

      <FileDropzone
        file={file}
        onSelect={setFile}
        disabled={pending}
        maxBytes={maxBytes}
      />

      <Field
        id="verificationId"
        label="Verification ID"
        hint="Optional. Supply it to check against one specific registration — that way a mismatch tells you the document differs, rather than that it was never registered."
      >
        <Input
          id="verificationId"
          value={verificationId}
          onChange={(event) => setVerificationId(event.target.value)}
          placeholder="PC-8F29A2"
          className="font-mono uppercase"
          disabled={pending}
        />
      </Field>

      <Button type="submit" disabled={pending || !file} className="w-full">
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Checking document
          </>
        ) : (
          "Verify document"
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Your document is not stored. It is fingerprinted in memory and the file
        is discarded immediately.
      </p>
    </form>
  );
}

function VerifyResult({
  response,
  submittedVerificationId,
  onReset,
}: {
  response: Response;
  submittedVerificationId: string | null;
  onReset: () => void;
}) {
  const { outcome, submittedHash } = response;

  return (
    <div className="space-y-8">
      {outcome.status === "verified" ? (
        <>
          <VerdictBanner
            verdict="verified"
            title="Document verified"
            description="This exact document is registered with ProofChain and has not been modified since."
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

          <div className="rounded-xl border bg-card p-6 sm:p-8">
            <h3 className="mb-6 text-base font-medium">Registration record</h3>
            <ProofDetails proof={outcome.proof} />
          </div>
        </>
      ) : outcome.status === "mismatch" ? (
        <>
          <VerdictBanner
            verdict="failed"
            title="Document verification failed"
            description="The uploaded document does not match the blockchain-registered document. It may have been modified, or it may be a different document altogether."
          >
            <div className="pt-2">
              <CheckList
                checks={[
                  { label: "Document fingerprint matches", passed: false },
                  { label: "Blockchain registration found", passed: true },
                  { label: "Issuer verified", passed: true },
                  { label: "Timestamp confirmed", passed: true },
                ]}
              />
            </div>
          </VerdictBanner>

          <div className="space-y-4 rounded-xl border bg-card p-6 sm:p-8">
            <h3 className="text-base font-medium">What was compared</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">
                  Fingerprint of your file
                </p>
                <HashDisplay hash={submittedHash} full />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Fingerprint registered for {outcome.proof.verificationId}
                </p>
                <HashDisplay hash={outcome.proof.documentHash} full />
              </div>
            </div>
          </div>
        </>
      ) : outcome.status === "pending" ? (
        <VerdictBanner
          verdict="pending"
          title="Proof not yet confirmed"
          description={`Registration ${outcome.verificationId} exists but has not been confirmed on the blockchain yet, so it cannot be used to verify a document.`}
        />
      ) : (
        <>
          <VerdictBanner
            verdict="not_found"
            title="Document could not be verified"
            description={
              submittedVerificationId
                ? `No registration was found for ${submittedVerificationId}. Check the ID, or try again without it to search every registered document.`
                : "This document does not match any document registered with ProofChain. That does not mean it is fake — only that its issuer has not registered it here."
            }
          />

          <div className="rounded-xl border bg-card p-6 sm:p-8">
            <p className="text-sm text-muted-foreground">
              Fingerprint of your file
            </p>
            <HashDisplay hash={submittedHash} full />
          </div>
        </>
      )}

      <Button variant="outline" onClick={onReset} className="w-full">
        <RotateCcw className="size-4" aria-hidden="true" />
        Check another document
      </Button>
    </div>
  );
}
