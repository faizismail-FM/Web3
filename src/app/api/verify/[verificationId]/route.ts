import { VerificationMethod } from "@prisma/client";

import { apiSuccess, withErrorHandling } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import {
  findProofByVerificationId,
  recordVerification,
} from "@/lib/services/verification";

type RouteContext = { params: Promise<{ verificationId: string }> };

/**
 * Public. Anyone holding a verification id can read the proof — that is the
 * product. Only non-sensitive fields are returned; see `PublicProof`.
 */
export const GET = withErrorHandling(
  async (_request: Request, { params }: RouteContext) => {
    const { verificationId } = await params;

    const outcome = await findProofByVerificationId(verificationId);
    const user = await getCurrentUser();

    await recordVerification({
      outcome,
      method: VerificationMethod.VERIFICATION_ID,
      verifiedBy: user?.id ?? null,
    });

    return apiSuccess({ outcome }, outcome.status === "not_found" ? 404 : 200);
  },
);
