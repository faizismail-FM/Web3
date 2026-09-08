import type { Metadata } from "next";

import { InviteDialog } from "@/components/organizations/invite-dialog";
import { MembersTable } from "@/components/organizations/members-table";
import { OrganizationForm } from "@/components/organizations/organization-form";
import { PendingInvitations } from "@/components/organizations/pending-invitations";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/common/stat-card";
import { EmptyState } from "@/components/common/empty-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { can } from "@/lib/auth/rbac";
import { requireUser } from "@/lib/auth/session";
import { getOrganizationWithMembers } from "@/lib/services/organizations";
import { Building2, FileText, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "Organization",
};

export default async function OrganizationPage() {
  const user = await requireUser("/organizations");

  if (!user.organizationId) {
    return (
      <>
        <PageHeader title="Organization" />
        <EmptyState
          icon={Building2}
          title="You are not in an organization"
          description="Ask a colleague for an invitation link, or create your own workspace."
        />
      </>
    );
  }

  const organization = await getOrganizationWithMembers(user.organizationId);
  const canManage = can.manageMembers(user.role);

  return (
    <>
      <PageHeader
        title="Organization"
        description="Your organization's details and who has access to its documents."
        actions={canManage ? <InviteDialog /> : null}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Members" value={organization.members.length} icon={Users} />
        <StatCard
          label="Documents"
          value={organization._count.documents}
          icon={FileText}
        />
        <StatCard
          label="Pending invitations"
          value={organization.invitations.length}
          icon={Building2}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>
            Shown to anyone verifying a document your organization registered.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationForm
            canEdit={can.manageOrganization(user.role)}
            defaults={{
              name: organization.name,
              registrationNumber: organization.registrationNumber ?? "",
              email: organization.email ?? "",
              walletAddress: organization.walletAddress ?? "",
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            Roles decide what each person can do. Documents never cross
            organization boundaries.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MembersTable
            currentUserId={user.id}
            canManage={canManage}
            members={organization.members.map((membership) => ({
              membershipId: membership.id,
              userId: membership.user.id,
              name: membership.user.name,
              email: membership.user.email,
              role: membership.role,
              joinedAt: membership.createdAt.toISOString(),
            }))}
          />
        </CardContent>
      </Card>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Pending invitations</CardTitle>
            <CardDescription>
              Invitations that have not been accepted yet. Each expires after
              seven days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PendingInvitations
              invitations={organization.invitations.map((invitation) => ({
                id: invitation.id,
                email: invitation.email,
                role: invitation.role,
                expiresAt: invitation.expiresAt.toISOString(),
                invitedBy: invitation.inviter.name,
              }))}
            />
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
