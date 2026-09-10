import { MemberRole } from "@prisma/client";
import type { NextRequest } from "next/server";

import { requireOrgMember } from "@/lib/api/guard";
import { ApiError, apiSuccess, withErrorHandling } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { getOrganizationWithMembers } from "@/lib/services/organizations";
import { updateOrganizationSchema } from "@/lib/validation/organizations";

export const GET = withErrorHandling(async () => {
  const context = await requireOrgMember();
  const organization = await getOrganizationWithMembers(context.organizationId);
  return apiSuccess({ organization, role: context.role });
});

export const PATCH = withErrorHandling(async (request: NextRequest) => {
  const context = await requireOrgMember(MemberRole.ADMIN);

  const body = await request.json().catch(() => {
    throw new ApiError("BAD_REQUEST", "Request body must be valid JSON.");
  });

  const input = updateOrganizationSchema.parse(body);

  const organization = await prisma.organization.update({
    where: { id: context.organizationId },
    data: {
      name: input.name,
      // Empty strings mean "clear this optional field".
      registrationNumber: input.registrationNumber || null,
      email: input.email || null,
      walletAddress: input.walletAddress || null,
    },
  });

  return apiSuccess({ organization });
});
