import { MemberRole } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/response";
import { hashPassword } from "@/lib/auth/password";
import {
  acceptInvitation,
  createInvitation,
  findUsableInvitation,
} from "@/lib/services/invitations";
import {
  createOrganizationWithOwner,
  removeMember,
  updateMemberRole,
} from "@/lib/services/organizations";
import { resetDatabase, testPrisma } from "../helpers/db";

beforeEach(resetDatabase);
afterAll(async () => {
  await resetDatabase();
  await testPrisma.$disconnect();
});

async function createUser(email: string, name = "Test Person") {
  return testPrisma.user.create({
    data: { name, email, passwordHash: await hashPassword("ProofChain123") },
  });
}

async function seedOrganizationWithMember(role = MemberRole.MEMBER) {
  const owner = await createUser("owner@example.test", "Faiz Ismail");
  const organization = await testPrisma.$transaction((tx) =>
    createOrganizationWithOwner(tx, {
      organizationName: "FM Global Logistics",
      userId: owner.id,
    }),
  );

  const member = await createUser("member@example.test", "Daniel Tan");
  const membership = await testPrisma.membership.create({
    data: { userId: member.id, organizationId: organization.id, role },
  });

  return { owner, organization, member, membership };
}

describe("updateMemberRole", () => {
  it("changes a member's role and records it", async () => {
    const { owner, organization, membership } =
      await seedOrganizationWithMember();

    await updateMemberRole({
      organizationId: organization.id,
      actorUserId: owner.id,
      membershipId: membership.id,
      role: MemberRole.ADMIN,
    });

    const updated = await testPrisma.membership.findUniqueOrThrow({
      where: { id: membership.id },
    });
    expect(updated.role).toBe(MemberRole.ADMIN);

    const activity = await testPrisma.activityLog.findFirst({
      where: { type: "MEMBER_ROLE_CHANGED" },
    });
    expect(activity).not.toBeNull();
  });

  it("refuses to change the owner's role", async () => {
    const { organization, member } = await seedOrganizationWithMember();
    const ownerMembership = await testPrisma.membership.findFirstOrThrow({
      where: { organizationId: organization.id, role: MemberRole.OWNER },
    });

    await expect(
      updateMemberRole({
        organizationId: organization.id,
        actorUserId: member.id,
        membershipId: ownerMembership.id,
        role: MemberRole.VIEWER,
      }),
    ).rejects.toThrow(ApiError);
  });

  it("refuses to let someone change their own role", async () => {
    const { organization, member, membership } =
      await seedOrganizationWithMember();

    await expect(
      updateMemberRole({
        organizationId: organization.id,
        actorUserId: member.id,
        membershipId: membership.id,
        role: MemberRole.ADMIN,
      }),
    ).rejects.toThrow(/cannot change your own role/);
  });

  it("refuses to touch a membership in another organization", async () => {
    const first = await seedOrganizationWithMember();

    const outsider = await createUser("outsider@example.test", "Outsider");
    const otherOrg = await testPrisma.$transaction((tx) =>
      createOrganizationWithOwner(tx, {
        organizationName: "Other Co",
        userId: outsider.id,
      }),
    );

    // Correct membership id, wrong organization: the scope check must win.
    await expect(
      updateMemberRole({
        organizationId: otherOrg.id,
        actorUserId: outsider.id,
        membershipId: first.membership.id,
        role: MemberRole.VIEWER,
      }),
    ).rejects.toThrow(/not part of this organization/);
  });
});

describe("removeMember", () => {
  it("removes the membership and clears the user's organization pointer", async () => {
    const { owner, organization, member, membership } =
      await seedOrganizationWithMember();

    await testPrisma.user.update({
      where: { id: member.id },
      data: { organizationId: organization.id },
    });

    await removeMember({
      organizationId: organization.id,
      actorUserId: owner.id,
      membershipId: membership.id,
    });

    expect(
      await testPrisma.membership.findUnique({ where: { id: membership.id } }),
    ).toBeNull();

    const refreshed = await testPrisma.user.findUniqueOrThrow({
      where: { id: member.id },
    });
    expect(refreshed.organizationId).toBeNull();
  });

  it("never leaves the organization without an owner", async () => {
    const { organization, member } = await seedOrganizationWithMember();
    const ownerMembership = await testPrisma.membership.findFirstOrThrow({
      where: { organizationId: organization.id, role: MemberRole.OWNER },
    });

    await expect(
      removeMember({
        organizationId: organization.id,
        actorUserId: member.id,
        membershipId: ownerMembership.id,
      }),
    ).rejects.toThrow(ApiError);

    expect(
      await testPrisma.membership.count({
        where: { organizationId: organization.id, role: MemberRole.OWNER },
      }),
    ).toBe(1);
  });
});

describe("invitations", () => {
  it("stores only a hash of the token", async () => {
    const { owner, organization } = await seedOrganizationWithMember();

    const { invitation, token } = await createInvitation({
      organizationId: organization.id,
      invitedBy: owner.id,
      role: MemberRole.MEMBER,
    });

    expect(invitation.tokenHash).not.toBe(token);
    expect(invitation.tokenHash).toMatch(/^[a-f0-9]{64}$/);

    const stored = await testPrisma.invitation.findUniqueOrThrow({
      where: { id: invitation.id },
    });
    expect(JSON.stringify(stored)).not.toContain(token);
  });

  it("resolves a valid token", async () => {
    const { owner, organization } = await seedOrganizationWithMember();
    const { token } = await createInvitation({
      organizationId: organization.id,
      invitedBy: owner.id,
      role: MemberRole.VIEWER,
    });

    const found = await findUsableInvitation(token);
    expect(found?.organization.name).toBe("FM Global Logistics");
  });

  it("rejects an unknown, revoked or expired token", async () => {
    const { owner, organization } = await seedOrganizationWithMember();

    expect(await findUsableInvitation("not-a-real-token")).toBeNull();

    const revoked = await createInvitation({
      organizationId: organization.id,
      invitedBy: owner.id,
      role: MemberRole.MEMBER,
    });
    await testPrisma.invitation.update({
      where: { id: revoked.invitation.id },
      data: { revokedAt: new Date() },
    });
    expect(await findUsableInvitation(revoked.token)).toBeNull();

    const expired = await createInvitation({
      organizationId: organization.id,
      invitedBy: owner.id,
      role: MemberRole.MEMBER,
    });
    await testPrisma.invitation.update({
      where: { id: expired.invitation.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect(await findUsableInvitation(expired.token)).toBeNull();
  });

  it("joins the invited organization with the invited role", async () => {
    const { owner, organization } = await seedOrganizationWithMember();
    const { token } = await createInvitation({
      organizationId: organization.id,
      invitedBy: owner.id,
      role: MemberRole.ADMIN,
    });

    const joiner = await createUser("joiner@example.test", "Aisyah Rahman");
    await testPrisma.$transaction((tx) =>
      acceptInvitation(tx, {
        token,
        userId: joiner.id,
        userEmail: joiner.email,
      }),
    );

    const membership = await testPrisma.membership.findFirstOrThrow({
      where: { userId: joiner.id },
    });
    expect(membership.organizationId).toBe(organization.id);
    expect(membership.role).toBe(MemberRole.ADMIN);
  });

  it("cannot be redeemed twice", async () => {
    const { owner, organization } = await seedOrganizationWithMember();
    const { token } = await createInvitation({
      organizationId: organization.id,
      invitedBy: owner.id,
      role: MemberRole.MEMBER,
    });

    const first = await createUser("first@example.test");
    await testPrisma.$transaction((tx) =>
      acceptInvitation(tx, { token, userId: first.id, userEmail: first.email }),
    );

    const second = await createUser("second@example.test");
    await expect(
      testPrisma.$transaction((tx) =>
        acceptInvitation(tx, {
          token,
          userId: second.id,
          userEmail: second.email,
        }),
      ),
    ).rejects.toThrow(/no longer valid/);
  });

  it("refuses an address-bound invitation used by someone else", async () => {
    const { owner, organization } = await seedOrganizationWithMember();
    const { token } = await createInvitation({
      organizationId: organization.id,
      invitedBy: owner.id,
      email: "expected@example.test",
      role: MemberRole.MEMBER,
    });

    const wrongPerson = await createUser("someone.else@example.test");
    await expect(
      testPrisma.$transaction((tx) =>
        acceptInvitation(tx, {
          token,
          userId: wrongPerson.id,
          userEmail: wrongPerson.email,
        }),
      ),
    ).rejects.toThrow(/different email address/);
  });
});
