import type { ReactNode } from "react";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * Chrome for pages that anyone can reach — the landing page and the
 * verification tools. Signed-in visitors get a route back into the app instead
 * of sign-in and sign-up buttons.
 */
export default async function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader isAuthenticated={Boolean(user)} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
