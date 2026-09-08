import { MemberRole } from "@prisma/client";
import type { NextRequest } from "next/server";

import { requireOrgMember } from "@/lib/api/guard";
import { ApiError, apiSuccess, withErrorHandling } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ invitationId: string }> };

export const DELETE = withErrorHandling(
  async (_request: NextRequest, { params }: RouteContext) => {
    const context = await requireOrgMember(MemberRole.ADMIN);
    const { invitationId } = await params;

    // Scoped by organization, so an admin cannot revoke another tenant's
    // invitation by guessing an id.
    const result = await prisma.invitation.updateMany({
      where: {
        id: invitationId,
        organizationId: context.organizationId,
        acceptedAt: null,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    if (result.count === 0) {
      throw new ApiError("NOT_FOUND", "That invitation is no longer active.");
    }

    return apiSuccess({ revoked: true });
  },
);
