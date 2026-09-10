import { apiSuccess, withErrorHandling } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Liveness and readiness probe.
 *
 * Reports only whether dependencies answer — never versions, connection
 * strings or configuration, which would be a gift to anyone scanning the
 * deployment.
 */
export const GET = withErrorHandling(async () => {
  let database: "up" | "down" = "down";

  try {
    await prisma.$queryRaw`SELECT 1`;
    database = "up";
  } catch (error) {
    console.error("[health] Database unreachable:", error);
  }

  const healthy = database === "up";

  return apiSuccess(
    { status: healthy ? "ok" : "degraded", database },
    healthy ? 200 : 503,
  );
});
