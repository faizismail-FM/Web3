import type { ActivityType, Prisma } from "@prisma/client";

import {
  ACTIVITY_GROUPS,
  type ActivityListQuery,
} from "@/lib/validation/activity";

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


/**
 * The audit trail for one organization.
 *
 * Scoped by organization in the `where` clause, like every other read: activity
 * mentions filenames and member names, so a leak here would be as bad as a leak
 * of the documents themselves.
 */
export async function listActivity(
  organizationId: string,
  query: ActivityListQuery,
) {
  const where: Prisma.ActivityLogWhereInput = {
    organizationId,
    ...(query.group
      ? { type: { in: [...ACTIVITY_GROUPS[query.group].types] } }
      : {}),
    ...(query.q
      ? { message: { contains: query.q, mode: "insensitive" } }
      : {}),
  };

  const [total, entries] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        type: true,
        message: true,
        createdAt: true,
        user: { select: { name: true } },
        document: { select: { id: true, filename: true } },
      },
    }),
  ]);

  return {
    entries,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  };
}

export type ActivityEntry = Awaited<
  ReturnType<typeof listActivity>
>["entries"][number];
