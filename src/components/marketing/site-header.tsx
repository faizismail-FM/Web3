import Link from "next/link";

import { Wordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export function SiteHeader({
  isAuthenticated = false,
}: {
  isAuthenticated?: boolean;
}) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="ProofChain home">
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <a
            href="#how-it-works"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            How it works
          </a>
          <a
            href="#capabilities"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Capabilities
          </a>
          <Link
            href="/verify"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Verify a document
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <Button asChild size="sm">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Start Verifying</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
