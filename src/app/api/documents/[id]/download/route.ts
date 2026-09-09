import { requireOrgMember } from "@/lib/api/guard";
import { ApiError, withErrorHandling } from "@/lib/api/response";
import { getDocumentForOrganization } from "@/lib/services/documents";
import { readDocument } from "@/lib/services/storage";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Serves a stored document to a member of the owning organization.
 *
 * This is the only path by which a stored file leaves the server. There is no
 * public URL for the storage directory, so authorization here is the entire
 * access control for document contents.
 */
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

    const bytes = await readDocument(document.storagePath);

    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": document.mimeType,
        // `attachment` prevents the PDF from being rendered inline in a context
        // where a crafted file could interact with the app's origin.
        "Content-Disposition": `attachment; filename="${encodeURIComponent(document.filename)}"`,
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "private, no-store",
      },
    });
  },
);
