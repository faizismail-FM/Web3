import { MemberRole } from "@prisma/client";
import { z } from "zod";

export const updateOrganizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Organization name must be at least 2 characters")
    .max(160),
  registrationNumber: z
    .string()
    .trim()
    .max(60, "Registration number must be at most 60 characters")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address")
    .optional()
    .or(z.literal("")),
  walletAddress: z
    .string()
    .trim()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Enter a valid wallet address")
    .optional()
    .or(z.literal("")),
});

/**
 * OWNER is absent by design: ownership transfer is a distinct, deliberate
 * action rather than something that can happen through the invite or
 * role-change forms.
 */
export const assignableRoleSchema = z.enum([
  MemberRole.ADMIN,
  MemberRole.MEMBER,
  MemberRole.VIEWER,
]);

export const createInvitationSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address")
    .optional()
    .or(z.literal("")),
  role: assignableRoleSchema.default(MemberRole.MEMBER),
});

export const updateMemberSchema = z.object({
  role: assignableRoleSchema,
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
