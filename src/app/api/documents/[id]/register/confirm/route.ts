import { MemberRole } from "@prisma/client";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { requireOrgMember } from "@/lib/api/guard";
import { ApiError, apiSuccess, withErrorHandling } from "@/lib/api/response";
import { confirmDocumentProof } from "@/lib/services/registrations";
import { verificationUrl } from "@/lib/verification/urls";

const bodySchema = z.object({
  transactionHash: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/, "Expected a transaction hash"),
});

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Confirms a wallet-signed registration.
 *
 * The transaction hash is the only thing accepted from the browser; every value
 * stored comes from the chain's own account of what happened.
 */
export const POST = withErrorHandling(
  async (request: NextRequest, { params }: RouteContext) => {
    const context = await requireOrgMember(MemberRole.MEMBER);
    const { id } = await params;

    const body = await request.json().catch(() => {
      throw new ApiError("BAD_REQUEST", "Request body must be valid JSON.");
    });

    const { transactionHash } = bodySchema.parse(body);

    const registration = await confirmDocumentProof({
      documentId: id,
      organizationId: context.organizationId,
      userId: context.id,
      transactionHash: transactionHash as `0x${string}`,
    });

    return apiSuccess({
      registration: {
        verificationId: registration.verificationId,
        verificationUrl: verificationUrl(registration.verificationId),
        status: registration.status,
        networkName: registration.networkName,
        transactionHash: registration.transactionHash,
        blockNumber: registration.blockNumber?.toString() ?? null,
        registeredAt: registration.registeredAt,
      },
    });
  },
);
