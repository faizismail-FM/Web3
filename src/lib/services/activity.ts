import type { ActivityType, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type RecordActivityInput = {
  type: ActivityType;
  message: string;
  organizationId?: string | null;
  userId?: string | null;
  documentId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

/**
 * Appends an entry to the audit trail.
 *
 * Logging is deliberately best-effort: a failure to write history must never
 * roll back or block the business operation that produced it.
 */
export async function recordActivity(
  input: RecordActivityInput,
  client: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> {
  try {
    await client.activityLog.create({
      data: {
        type: input.type,
        message: input.message,
        organizationId: input.organizationId ?? null,
        userId: input.userId ?? null,
        documentId: input.documentId ?? null,
        metadata: input.metadata,
      },
    });
  } catch (error) {
    console.error("[activity] Failed to record activity log entry:", error);
  }
}
