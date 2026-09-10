import { FileQuestion } from "lucide-react";
import Link from "next/link";

import { Wordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center px-6">
        <Link href="/" aria-label="ProofChain home">
          <Wordmark />
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-20">
        <div className="max-w-md text-center">
          <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-muted">
            <FileQuestion
              className="size-5 text-muted-foreground"
              aria-hidden="true"
            />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">
            Page not found
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The page you were looking for does not exist, or you do not have
            access to it.
          </p>
          <div className="mt-8 flex justify-center gap-2">
            <Button asChild>
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/verify">Verify a document</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
