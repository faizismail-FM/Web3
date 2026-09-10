import { VerificationMethod } from "@prisma/client";

import { clientKey } from "@/lib/api/rate-limit";
import {
  apiSuccess,
  enforceRateLimit,
  withErrorHandling,
} from "@/lib/api/response";
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
  async (request: Request, { params }: RouteContext) => {
    enforceRateLimit(`verify-lookup:${clientKey(request)}`, {
      limit: 120,
      windowMs: 10 * 60 * 1000,
    });

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
