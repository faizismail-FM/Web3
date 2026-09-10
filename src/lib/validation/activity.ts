import { ActivityType } from "@prisma/client";
import { z } from "zod";

/**
 * Activity types grouped the way people think about them, rather than one entry
 * per enum member. "Show me verifications" is a real question; "show me
 * VERIFICATION_FAILED specifically" is not.
 */
export const ACTIVITY_GROUPS = {
  documents: {
    label: "Documents",
    types: [ActivityType.DOCUMENT_UPLOADED, ActivityType.HASH_GENERATED],
  },
  proofs: {
    label: "Blockchain proofs",
    types: [
      ActivityType.BLOCKCHAIN_REGISTRATION_STARTED,
      ActivityType.BLOCKCHAIN_REGISTRATION_COMPLETED,
      ActivityType.BLOCKCHAIN_REGISTRATION_FAILED,
    ],
  },
  verifications: {
    label: "Verifications",
    types: [ActivityType.DOCUMENT_VERIFIED, ActivityType.VERIFICATION_FAILED],
  },
  team: {
    label: "Team and workspace",
    types: [
      ActivityType.USER_REGISTERED,
      ActivityType.ORGANIZATION_CREATED,
      ActivityType.MEMBER_INVITED,
      ActivityType.MEMBER_ROLE_CHANGED,
      ActivityType.MEMBER_REMOVED,
      ActivityType.WALLET_CONNECTED,
    ],
  },
} as const;

export type ActivityGroupKey = keyof typeof ACTIVITY_GROUPS;

export const activityListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  group: z
    .enum(["documents", "proofs", "verifications", "team"])
    .optional(),
  q: z.string().trim().max(200).optional(),
});

export type ActivityListQuery = z.infer<typeof activityListQuerySchema>;
