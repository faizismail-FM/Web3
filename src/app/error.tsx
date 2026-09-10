"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * Last-resort boundary.
 *
 * Deliberately shows no stack trace, error message or digest to the user — a
 * raw error can leak table names, file paths or query fragments. The detail is
 * logged where operators can reach it instead.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-destructive-muted">
          <AlertTriangle
            className="size-5 text-destructive"
            aria-hidden="true"
          />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We could not load this page. Your documents and proofs are unaffected.
        </p>
        <div className="mt-8">
          <Button onClick={reset}>Try again</Button>
        </div>
      </div>
    </div>
  );
}
