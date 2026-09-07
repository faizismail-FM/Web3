import type { MemberRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth/options";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  organizationId: string | null;
  role: MemberRole | null;
  walletAddress: string | null;
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  return {
    id: session.user.id,
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    organizationId: session.user.organizationId,
    role: session.user.role,
    walletAddress: session.user.walletAddress,
  };
}

/**
 * Server-component guard. Redirects to the login page (preserving the intended
 * destination) instead of rendering a protected page for an anonymous visitor.
 */
export async function requireUser(callbackUrl?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    const target = callbackUrl
      ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
      : "/login";
    redirect(target);
  }
  return user;
}
