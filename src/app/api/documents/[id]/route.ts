import { requireOrgMember } from "@/lib/api/guard";
import { ApiError, apiSuccess, withErrorHandling } from "@/lib/api/response";
import { getDocumentForOrganization } from "@/lib/services/documents";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withErrorHandling(
  async (_request: Request, { params }: RouteContext) => {
    const context = await requireOrgMember();
    const { id } = await params;

    const document = await getDocumentForOrganization(
      id,
      context.organizationId,
    );
    if (!document) {
      throw new ApiError("NOT_FOUND", "That document could not be found.");
    }

    return apiSuccess({ document });
  },
);
