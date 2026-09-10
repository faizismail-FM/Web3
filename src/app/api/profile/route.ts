import type { NextRequest } from "next/server";

import { ApiError, apiSuccess, withErrorHandling } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { updateProfileSchema } from "@/lib/validation/auth";

export const GET = withErrorHandling(async () => {
  const current = await getCurrentUser();
  if (!current) {
    throw new ApiError("UNAUTHORIZED", "You need to sign in to continue.");
  }

  const user = await prisma.user.findUnique({
    where: { id: current.id },
    select: {
      id: true,
      name: true,
      email: true,
      walletAddress: true,
      createdAt: true,
      organization: { select: { id: true, name: true } },
    },
  });

  if (!user) {
    throw new ApiError("NOT_FOUND", "This account no longer exists.");
  }

  return apiSuccess({ user });
});

export const PATCH = withErrorHandling(async (request: NextRequest) => {
  const current = await getCurrentUser();
  if (!current) {
    throw new ApiError("UNAUTHORIZED", "You need to sign in to continue.");
  }

  const body = await request.json().catch(() => {
    throw new ApiError("BAD_REQUEST", "Request body must be valid JSON.");
  });

  const input = updateProfileSchema.parse(body);

  const user = await prisma.user.update({
    where: { id: current.id },
    data: {
      name: input.name,
      // An empty string means "clear the connected wallet".
      walletAddress: input.walletAddress ? input.walletAddress : null,
    },
    select: { id: true, name: true, email: true, walletAddress: true },
  });

  return apiSuccess({ user });
});
