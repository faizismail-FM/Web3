import { createHash, randomBytes } from "node:crypto";

import { ActivityType, MemberRole, type Prisma } from "@prisma/client";

import { ApiError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/services/activity";

/** Invitations expire after a week; a stale link should stop working. */
const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Invitation tokens are stored only as a SHA-256 digest, so a database leak
 * yields no usable links. SHA-256 (rather than bcrypt) is appropriate here: the
 * token is 256 bits of entropy we generated, not a low-entropy human secret, so
 * there is nothing to brute-force.
 */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createInvitation(input: {
  organizationId: string;
  invitedBy: string;
  email?: string | null;
  role: MemberRole;
}) {
  const token = randomBytes(32).toString("base64url");

  const invitation = await prisma.$transaction(async (tx) => {
    const created = await tx.invitation.create({
      data: {
        organizationId: input.organizationId,
        invitedBy: input.invitedBy,
        email: input.email || null,
        role: input.role,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
      },
    });

    await recordActivity(
      {
        type: ActivityType.MEMBER_INVITED,
        message: input.email
          ? `Invited ${input.email} as ${input.role.toLowerCase()}`
          : `Created a ${input.role.toLowerCase()} invitation link`,
        organizationId: input.organizationId,
        userId: input.invitedBy,
      },
      tx,
    );

    return created;
  });

  // The raw token is returned exactly once, here. It is never stored and cannot
  // be recovered later — a lost link must be reissued.
  return { invitation, token };
}

type PendingInvitation = Prisma.InvitationGetPayload<{
  include: { organization: { select: { id: true; name: true } } };
}>;

/**
 * Looks up a usable invitation, treating "expired", "revoked", "already used"
 * and "never existed" identically from the caller's point of view.
 */
export async function findUsableInvitation(
  token: string,
): Promise<PendingInvitation | null> {
  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { organization: { select: { id: true, name: true } } },
  });

  if (!invitation) return null;
  if (invitation.acceptedAt || invitation.revokedAt) return null;
  if (invitation.expiresAt.getTime() < Date.now()) return null;

  return invitation;
}

/**
 * Consumes an invitation and creates the membership.
 *
 * Runs inside the caller's transaction so that a new account and its membership
 * are created together, and marks the invitation accepted in the same commit so
 * one link cannot be redeemed twice.
 */
export async function acceptInvitation(
  tx: Prisma.TransactionClient,
  input: { token: string; userId: string; userEmail: string },
) {
  const invitation = await tx.invitation.findUnique({
    where: { tokenHash: hashToken(input.token) },
  });

  if (
    !invitation ||
    invitation.acceptedAt ||
    invitation.revokedAt ||
    invitation.expiresAt.getTime() < Date.now()
  ) {
    throw new ApiError(
      "BAD_REQUEST",
      "This invitation link is no longer valid. Ask for a new one.",
    );
  }

  // An invitation addressed to a specific person may only be used by them.
  if (
    invitation.email &&
    invitation.email.toLowerCase() !== input.userEmail.toLowerCase()
  ) {
    throw new ApiError(
      "FORBIDDEN",
      "This invitation was issued to a different email address.",
    );
  }

  await tx.membership.create({
    data: {
      userId: input.userId,
      organizationId: invitation.organizationId,
      role: invitation.role,
    },
  });

  await tx.user.update({
    where: { id: input.userId },
    data: { organizationId: invitation.organizationId },
  });

  await tx.invitation.update({
    where: { id: invitation.id },
    data: { acceptedAt: new Date() },
  });

  return invitation;
}
