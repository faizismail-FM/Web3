import { ActivityType, MemberRole, type Prisma } from "@prisma/client";

import { ApiError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/services/activity";

type CreateOrganizationWithOwnerInput = {
  organizationName: string;
  userId: string;
  email?: string | null;
};

/**
 * Creates an organization and installs the given user as its OWNER.
 *
 * Runs inside the caller's transaction so that registration is atomic: a user
 * is never left without an organization, and an organization is never left
 * without an owner.
 */
export async function createOrganizationWithOwner(
  tx: Prisma.TransactionClient,
  input: CreateOrganizationWithOwnerInput,
) {
  const organization = await tx.organization.create({
    data: {
      name: input.organizationName,
      email: input.email ?? null,
    },
  });

  await tx.membership.create({
    data: {
      userId: input.userId,
      organizationId: organization.id,
      role: MemberRole.OWNER,
    },
  });

  await tx.user.update({
    where: { id: input.userId },
    data: { organizationId: organization.id },
  });

  await recordActivity(
    {
      type: ActivityType.ORGANIZATION_CREATED,
      message: `Organization "${organization.name}" was created`,
      organizationId: organization.id,
      userId: input.userId,
    },
    tx,
  );

  return organization;
}

/**
 * Loads an organization with its members, ordered by rank so owners and admins
 * appear first rather than in insertion order.
 */
export async function getOrganizationWithMembers(organizationId: string) {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, walletAddress: true } },
        },
      },
      invitations: {
        where: { acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
        include: { inviter: { select: { name: true } } },
      },
      _count: { select: { documents: true } },
    },
  });

  if (!organization) {
    throw new ApiError("NOT_FOUND", "This organization no longer exists.");
  }

  const rank: Record<MemberRole, number> = {
    [MemberRole.OWNER]: 0,
    [MemberRole.ADMIN]: 1,
    [MemberRole.MEMBER]: 2,
    [MemberRole.VIEWER]: 3,
  };
  organization.members.sort(
    (a, b) => rank[a.role] - rank[b.role] || a.user.name.localeCompare(b.user.name),
  );

  return organization;
}

/**
 * Guards every membership mutation.
 *
 * Two invariants hold regardless of the caller's role: an organization always
 * keeps at least one owner, and nobody may change or remove their own
 * membership (which would otherwise let an admin lock the owner out, or an
 * owner strand the organization).
 */
async function assertMembershipMutationAllowed(
  organizationId: string,
  actorUserId: string,
  membershipId: string,
) {
  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, organizationId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  if (!membership) {
    throw new ApiError("NOT_FOUND", "That member is not part of this organization.");
  }

  if (membership.userId === actorUserId) {
    throw new ApiError(
      "FORBIDDEN",
      "You cannot change your own role or remove yourself. Ask another administrator.",
    );
  }

  if (membership.role === MemberRole.OWNER) {
    throw new ApiError(
      "FORBIDDEN",
      "The organization owner cannot be changed or removed from here.",
    );
  }

  return membership;
}

export async function updateMemberRole(input: {
  organizationId: string;
  actorUserId: string;
  membershipId: string;
  role: MemberRole;
}) {
  const membership = await assertMembershipMutationAllowed(
    input.organizationId,
    input.actorUserId,
    input.membershipId,
  );

  const updated = await prisma.membership.update({
    where: { id: membership.id },
    data: { role: input.role },
  });

  await recordActivity({
    type: ActivityType.MEMBER_ROLE_CHANGED,
    message: `${membership.user.name} is now a ${input.role.toLowerCase()}`,
    organizationId: input.organizationId,
    userId: input.actorUserId,
  });

  return updated;
}

export async function removeMember(input: {
  organizationId: string;
  actorUserId: string;
  membershipId: string;
}) {
  const membership = await assertMembershipMutationAllowed(
    input.organizationId,
    input.actorUserId,
    input.membershipId,
  );

  await prisma.$transaction(async (tx) => {
    await tx.membership.delete({ where: { id: membership.id } });

    // Clear the convenience pointer so the removed user is not left appearing
    // to belong to an organization they can no longer access.
    await tx.user.updateMany({
      where: { id: membership.userId, organizationId: input.organizationId },
      data: { organizationId: null },
    });
  });

  await recordActivity({
    type: ActivityType.MEMBER_REMOVED,
    message: `${membership.user.name} was removed from the organization`,
    organizationId: input.organizationId,
    userId: input.actorUserId,
  });
}
