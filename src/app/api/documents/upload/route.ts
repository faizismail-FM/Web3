import { MemberRole } from "@prisma/client";
import type { NextRequest } from "next/server";

import { requireOrgMember } from "@/lib/api/guard";
import { ApiError, apiSuccess, withErrorHandling } from "@/lib/api/response";
import { documentTypeLabel } from "@/lib/documents/types";
import { createDocumentFromUpload } from "@/lib/services/documents";
import { uploadMetadataSchema } from "@/lib/validation/documents";

/** Node runtime: hashing and filesystem storage are not available on edge. */
export const runtime = "nodejs";

export const POST = withErrorHandling(async (request: NextRequest) => {
  const context = await requireOrgMember(MemberRole.MEMBER);

  const formData = await request.formData().catch(() => {
    throw new ApiError("BAD_REQUEST", "Expected a file upload.");
  });

  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new ApiError("BAD_REQUEST", "Choose a document to upload.");
  }

  const metadata = uploadMetadataSchema.parse({
    documentType: formData.get("documentType") ?? undefined,
    documentTypeLabel: formData.get("documentTypeLabel") ?? undefined,
  });

  const document = await createDocumentFromUpload({
    organizationId: context.organizationId,
    userId: context.id,
    file,
    documentType: metadata.documentType,
    documentTypeLabel: metadata.documentTypeLabel,
  });

  return apiSuccess(
    {
      document: {
        id: document.id,
        filename: document.filename,
        documentType: document.documentType,
        documentTypeLabel: documentTypeLabel(
          document.documentType,
          document.documentTypeLabel,
        ),
        fileSize: document.fileSize,
        sha256Hash: document.sha256Hash,
        status: document.status,
        createdAt: document.createdAt,
      },
    },
    201,
  );
});
