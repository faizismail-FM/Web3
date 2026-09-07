import { MemberRole } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { can, hasRole } from "@/lib/auth/rbac";

describe("role hierarchy", () => {
  it("treats higher roles as satisfying lower requirements", () => {
    expect(hasRole(MemberRole.OWNER, MemberRole.VIEWER)).toBe(true);
    expect(hasRole(MemberRole.ADMIN, MemberRole.MEMBER)).toBe(true);
    expect(hasRole(MemberRole.MEMBER, MemberRole.MEMBER)).toBe(true);
  });

  it("does not promote lower roles", () => {
    expect(hasRole(MemberRole.VIEWER, MemberRole.MEMBER)).toBe(false);
    expect(hasRole(MemberRole.MEMBER, MemberRole.ADMIN)).toBe(false);
    expect(hasRole(MemberRole.ADMIN, MemberRole.OWNER)).toBe(false);
  });

  it("denies everything when there is no role", () => {
    expect(hasRole(null, MemberRole.VIEWER)).toBe(false);
    expect(hasRole(undefined, MemberRole.VIEWER)).toBe(false);
  });
});

describe("permissions", () => {
  it("lets viewers read but not upload or register", () => {
    expect(can.viewDocuments(MemberRole.VIEWER)).toBe(true);
    expect(can.uploadDocuments(MemberRole.VIEWER)).toBe(false);
    expect(can.registerOnChain(MemberRole.VIEWER)).toBe(false);
  });

  it("lets members upload and register, but not manage the team", () => {
    expect(can.uploadDocuments(MemberRole.MEMBER)).toBe(true);
    expect(can.registerOnChain(MemberRole.MEMBER)).toBe(true);
    expect(can.manageMembers(MemberRole.MEMBER)).toBe(false);
  });

  it("reserves organization deletion for the owner", () => {
    expect(can.deleteOrganization(MemberRole.ADMIN)).toBe(false);
    expect(can.deleteOrganization(MemberRole.OWNER)).toBe(true);
  });
});
