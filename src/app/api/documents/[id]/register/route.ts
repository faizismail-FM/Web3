import { MemberRole } from "@prisma/client";

import { requireOrgMember } from "@/lib/api/guard";
import { ApiError, apiSuccess, withErrorHandling } from "@/lib/api/response";
import {
  registerDocumentProof,
  requiresWalletSignature,
} from "@/lib/services/registrations";
import { verificationUrl } from "@/lib/verification/urls";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withErrorHandling(
  async (_request: Request, { params }: RouteContext) => {
    const context = await requireOrgMember(MemberRole.MEMBER);
    const { id } = await params;

    // Real proofs are signed by the organization's wallet, so this server-side
    // path exists only for simulation mode.
    if (requiresWalletSignature()) {
      throw new ApiError(
        "BAD_REQUEST",
        "This deployment anchors proofs on-chain. Connect a wallet and create the proof from the document page.",
      );
    }

    const registration = await registerDocumentProof({
      documentId: id,
      organizationId: context.organizationId,
      userId: context.id,
    });

    return apiSuccess(
      {
        registration: {
          verificationId: registration.verificationId,
          verificationUrl: verificationUrl(registration.verificationId),
          status: registration.status,
          mode: registration.mode,
          networkName: registration.networkName,
          transactionHash: registration.transactionHash,
          blockNumber: registration.blockNumber?.toString() ?? null,
          registeredAt: registration.registeredAt,
        },
      },
      201,
    );
  },
);
