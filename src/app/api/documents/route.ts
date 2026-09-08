import type { NextRequest } from "next/server";

import { requireOrgMember } from "@/lib/api/guard";
import { apiSuccess, withErrorHandling } from "@/lib/api/response";
import { listDocuments } from "@/lib/services/documents";
import { documentListQuerySchema } from "@/lib/validation/documents";

export const GET = withErrorHandling(async (request: NextRequest) => {
  const context = await requireOrgMember();

  const query = documentListQuerySchema.parse(
    Object.fromEntries(request.nextUrl.searchParams),
  );

  // The organization comes from the session, never from the query string.
  const result = await listDocuments(context.organizationId, query);
  return apiSuccess(result);
});
