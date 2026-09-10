import { MemberRole } from "@prisma/client";

import { requireOrgMember } from "@/lib/api/guard";
import { ApiError, apiSuccess, withErrorHandling } from "@/lib/api/response";
import {
  prepareDocumentProof,
  requiresWalletSignature,
} from "@/lib/services/registrations";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Reserves a verification id and returns what the browser needs to build the
 * transaction. Real mode only — in mock mode the server anchors directly.
 */
export const POST = withErrorHandling(
  async (_request: Request, { params }: RouteContext) => {
    const context = await requireOrgMember(MemberRole.MEMBER);
    const { id } = await params;

    if (!requiresWalletSignature()) {
      throw new ApiError(
        "BAD_REQUEST",
        "This deployment creates proofs without a wallet. Use the standard registration action.",
      );
    }

    const prepared = await prepareDocumentProof({
      documentId: id,
      organizationId: context.organizationId,
      userId: context.id,
    });

    return apiSuccess({ prepared });
  },
);
