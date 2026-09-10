import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Wordmark } from "@/components/brand/logo";
import { getCurrentUser } from "@/lib/auth/session";

export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Signed-in users have no reason to see the login or registration forms.
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center px-6">
        <Link href="/" aria-label="ProofChain home">
          <Wordmark />
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <footer className="px-6 pb-8 text-center text-xs text-muted-foreground">
        Documents are stored securely off-chain. Only a cryptographic hash is
        published.
      </footer>
    </div>
  );
}
