import type { MemberRole } from "@prisma/client";

import { ApiError } from "@/lib/api/response";
import { hasRole } from "@/lib/auth/rbac";
import { getCurrentUser, type SessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export type OrgContext = SessionUser & {
  organizationId: string;
  role: MemberRole;
};

/** Requires a signed-in user, without assuming they belong to an organization. */
export async function requireApiUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new ApiError("UNAUTHORIZED", "You need to sign in to continue.");
  }
  return user;
}

/**
 * The single entry point for organization-scoped authorization.
 *
 * Membership is re-read from the database rather than trusted from the session
 * token, so a role change or removal takes effect immediately instead of when
 * the token happens to expire. Every organization-scoped route goes through
 * here, which is what makes "no cross-tenant reads" a property of the system
 * rather than a habit.
 */
export async function requireOrgMember(
  minimumRole: MemberRole = "VIEWER",
): Promise<OrgContext> {
  const user = await requireApiUser();

  const membership = await prisma.membership.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  if (!membership) {
    throw new ApiError(
      "FORBIDDEN",
      "You are not a member of an organization yet.",
    );
  }

  if (!hasRole(membership.role, minimumRole)) {
    throw new ApiError(
      "FORBIDDEN",
      "Your role does not allow this action. Ask an administrator for access.",
    );
  }

  return {
    ...user,
    organizationId: membership.organizationId,
    role: membership.role,
  };
}
