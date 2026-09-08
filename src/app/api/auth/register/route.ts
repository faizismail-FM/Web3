import { ActivityType, Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";

import { ApiError, apiSuccess, withErrorHandling } from "@/lib/api/response";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/services/activity";
import { acceptInvitation } from "@/lib/services/invitations";
import { createOrganizationWithOwner } from "@/lib/services/organizations";
import { registerSchema } from "@/lib/validation/auth";

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json().catch(() => {
    throw new ApiError("BAD_REQUEST", "Request body must be valid JSON.");
  });

  const input = registerSchema.parse(body);
  const passwordHash = await hashPassword(input.password);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash,
        },
      });

      // An invited user joins the inviting organization; everyone else creates
      // their own workspace and owns it.
      const organization = input.invitationToken
        ? await acceptInvitation(tx, {
            token: input.invitationToken,
            userId: user.id,
            userEmail: user.email,
          }).then(({ organizationId }) =>
            tx.organization.findUniqueOrThrow({
              where: { id: organizationId },
            }),
          )
        : await createOrganizationWithOwner(tx, {
            organizationName: input.organizationName as string,
            userId: user.id,
            email: input.email,
          });

      await recordActivity(
        {
          type: ActivityType.USER_REGISTERED,
          message: `${user.name} created an account`,
          organizationId: organization.id,
          userId: user.id,
        },
        tx,
      );

      return { user, organization };
    });

    return apiSuccess(
      {
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
        },
        organization: {
          id: result.organization.id,
          name: result.organization.name,
        },
      },
      201,
    );
  } catch (error) {
    // P2002 = unique constraint violation, which here can only be the email.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ApiError(
        "CONFLICT",
        "An account with this email address already exists.",
        { email: "This email address is already registered." },
      );
    }
    throw error;
  }
});
