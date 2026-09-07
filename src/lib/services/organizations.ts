import { ActivityType, MemberRole, type Prisma } from "@prisma/client";

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
