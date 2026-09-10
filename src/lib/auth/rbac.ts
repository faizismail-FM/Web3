import { MemberRole } from "@prisma/client";

/**
 * Roles are strictly hierarchical: every capability granted to a lower rank is
 * also granted to the ranks above it. Comparing ranks keeps permission checks
 * to a single numeric comparison instead of scattered role lists.
 */
const RANK: Record<MemberRole, number> = {
  [MemberRole.VIEWER]: 0,
  [MemberRole.MEMBER]: 1,
  [MemberRole.ADMIN]: 2,
  [MemberRole.OWNER]: 3,
};

export function hasRole(
  role: MemberRole | null | undefined,
  minimum: MemberRole,
): boolean {
  if (!role) return false;
  return RANK[role] >= RANK[minimum];
}

/** Permissions expressed in product terms rather than raw role names. */
export const can = {
  viewDocuments: (role: MemberRole | null | undefined) =>
    hasRole(role, MemberRole.VIEWER),
  uploadDocuments: (role: MemberRole | null | undefined) =>
    hasRole(role, MemberRole.MEMBER),
  registerOnChain: (role: MemberRole | null | undefined) =>
    hasRole(role, MemberRole.MEMBER),
  manageMembers: (role: MemberRole | null | undefined) =>
    hasRole(role, MemberRole.ADMIN),
  manageOrganization: (role: MemberRole | null | undefined) =>
    hasRole(role, MemberRole.ADMIN),
  deleteOrganization: (role: MemberRole | null | undefined) =>
    hasRole(role, MemberRole.OWNER),
} as const;

export const ROLE_LABELS: Record<MemberRole, string> = {
  [MemberRole.OWNER]: "Owner",
  [MemberRole.ADMIN]: "Admin",
  [MemberRole.MEMBER]: "Member",
  [MemberRole.VIEWER]: "Viewer",
};

export const ROLE_DESCRIPTIONS: Record<MemberRole, string> = {
  [MemberRole.OWNER]: "Full control, including billing and deletion.",
  [MemberRole.ADMIN]: "Manage members, settings, and all documents.",
  [MemberRole.MEMBER]: "Upload documents and create blockchain proofs.",
  [MemberRole.VIEWER]: "Read-only access to documents and activity.",
};
