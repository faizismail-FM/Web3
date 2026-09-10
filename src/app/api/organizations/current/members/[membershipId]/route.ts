import { MemberRole } from "@prisma/client";
import type { NextRequest } from "next/server";

import { requireOrgMember } from "@/lib/api/guard";
import { ApiError, apiSuccess, withErrorHandling } from "@/lib/api/response";
import { removeMember, updateMemberRole } from "@/lib/services/organizations";
import { updateMemberSchema } from "@/lib/validation/organizations";

type RouteContext = { params: Promise<{ membershipId: string }> };

export const PATCH = withErrorHandling(
  async (request: NextRequest, { params }: RouteContext) => {
    const context = await requireOrgMember(MemberRole.ADMIN);
    const { membershipId } = await params;

    const body = await request.json().catch(() => {
      throw new ApiError("BAD_REQUEST", "Request body must be valid JSON.");
    });

    const input = updateMemberSchema.parse(body);

    const membership = await updateMemberRole({
      organizationId: context.organizationId,
      actorUserId: context.id,
      membershipId,
      role: input.role,
    });

    return apiSuccess({ membership });
  },
);

export const DELETE = withErrorHandling(
  async (_request: NextRequest, { params }: RouteContext) => {
    const context = await requireOrgMember(MemberRole.ADMIN);
    const { membershipId } = await params;

    await removeMember({
      organizationId: context.organizationId,
      actorUserId: context.id,
      membershipId,
    });

    return apiSuccess({ removed: true });
  },
);
