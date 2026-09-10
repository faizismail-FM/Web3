import { VerificationMethod } from "@prisma/client";
import type { NextRequest } from "next/server";

import { clientKey } from "@/lib/api/rate-limit";
import {
  ApiError,
  apiSuccess,
  enforceRateLimit,
  withErrorHandling,
} from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { assertAllowedUpload, sanitizeFilename } from "@/lib/documents/upload-rules";
import { getServerEnv } from "@/lib/env";
import { sha256 } from "@/lib/services/hashing";
import { recordVerification, verifyHash } from "@/lib/services/verification";

export const runtime = "nodejs";

/**
 * Public verification by upload.
 *
 * The submitted file is hashed in memory and discarded — a document brought for
 * checking is never stored, which is what makes it safe to verify a
 * counterparty's confidential paperwork here.
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  enforceRateLimit(`verify-upload:${clientKey(request)}`, {
    limit: 30,
    windowMs: 10 * 60 * 1000,
  });

  const env = getServerEnv();

  const formData = await request.formData().catch(() => {
    throw new ApiError("BAD_REQUEST", "Expected a file upload.");
  });

  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new ApiError("BAD_REQUEST", "Choose a document to verify.");
  }

  if (file.size > env.MAX_UPLOAD_BYTES) {
    const limitMb = Math.floor(env.MAX_UPLOAD_BYTES / (1024 * 1024));
    throw new ApiError(
      "PAYLOAD_TOO_LARGE",
      `File is too large. The maximum size is ${limitMb} MB.`,
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  assertAllowedUpload({
    filename: sanitizeFilename(file.name),
    mimeType: file.type,
    size: bytes.byteLength,
    maxBytes: env.MAX_UPLOAD_BYTES,
    bytes,
  });

  const sha256Hash = sha256(bytes);
  const rawVerificationId = formData.get("verificationId");

  const outcome = await verifyHash({
    sha256Hash,
    verificationId:
      typeof rawVerificationId === "string" && rawVerificationId.trim()
        ? rawVerificationId
        : null,
  });

  const user = await getCurrentUser();
  await recordVerification({
    outcome,
    method: VerificationMethod.FILE_UPLOAD,
    submittedHash: sha256Hash,
    verifiedBy: user?.id ?? null,
  });

  return apiSuccess({ outcome, submittedHash: sha256Hash });
});
