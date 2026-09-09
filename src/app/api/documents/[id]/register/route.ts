import { MemberRole } from "@prisma/client";

import { requireOrgMember } from "@/lib/api/guard";
import { apiSuccess, withErrorHandling } from "@/lib/api/response";
import { registerDocumentProof } from "@/lib/services/registrations";
import { verificationUrl } from "@/lib/verification/urls";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withErrorHandling(
  async (_request: Request, { params }: RouteContext) => {
    const context = await requireOrgMember(MemberRole.MEMBER);
    const { id } = await params;

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
