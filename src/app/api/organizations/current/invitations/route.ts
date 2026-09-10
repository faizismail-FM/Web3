import { MemberRole } from "@prisma/client";
import type { NextRequest } from "next/server";

import { requireOrgMember } from "@/lib/api/guard";
import { ApiError, apiSuccess, withErrorHandling } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { createInvitation } from "@/lib/services/invitations";
import { createInvitationSchema } from "@/lib/validation/organizations";

export const POST = withErrorHandling(async (request: NextRequest) => {
  const context = await requireOrgMember(MemberRole.ADMIN);

  const body = await request.json().catch(() => {
    throw new ApiError("BAD_REQUEST", "Request body must be valid JSON.");
  });

  const input = createInvitationSchema.parse(body);

  if (input.email) {
    const alreadyMember = await prisma.membership.findFirst({
      where: {
        organizationId: context.organizationId,
        user: { email: input.email },
      },
    });
    if (alreadyMember) {
      throw new ApiError(
        "CONFLICT",
        "That person is already a member of this organization.",
        { email: "Already a member." },
      );
    }
  }

  const { invitation, token } = await createInvitation({
    organizationId: context.organizationId,
    invitedBy: context.id,
    email: input.email,
    role: input.role,
  });

  return apiSuccess(
    {
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      },
      // Shown to the inviter once, so they can pass the link on themselves.
      // There is no email delivery yet, and the token is not recoverable later.
      token,
    },
    201,
  );
});
