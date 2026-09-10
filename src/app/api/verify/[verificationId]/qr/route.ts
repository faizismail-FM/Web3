import { ApiError, withErrorHandling } from "@/lib/api/response";
import { findProofByVerificationId } from "@/lib/services/verification";
import { verificationQrPng, verificationQrSvg } from "@/lib/verification/qr";
import { normalizeVerificationId } from "@/lib/verification/id";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ verificationId: string }> };

/**
 * Public QR image for a verification URL.
 *
 * Generated only for ids that actually exist, so the endpoint cannot be used to
 * mint official-looking codes for arbitrary strings.
 */
export const GET = withErrorHandling(
  async (request: Request, { params }: RouteContext) => {
    const { verificationId: rawId } = await params;
    const verificationId = normalizeVerificationId(rawId);

    if (!verificationId) {
      throw new ApiError("BAD_REQUEST", "That is not a valid verification ID.");
    }

    const outcome = await findProofByVerificationId(verificationId);
    if (outcome.status === "not_found") {
      throw new ApiError("NOT_FOUND", "That verification ID does not exist.");
    }

    const format = new URL(request.url).searchParams.get("format") ?? "svg";

    if (format === "png") {
      const png = await verificationQrPng(verificationId);
      return new Response(new Uint8Array(png), {
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": `attachment; filename="${verificationId}-qr.png"`,
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    const svg = await verificationQrSvg(verificationId);
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  },
);
