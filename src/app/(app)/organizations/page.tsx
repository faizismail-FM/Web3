import { Building2 } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Organization",
};

export default function Page() {
  return (
    <>
      <PageHeader title="Organization" description="Manage your organization's details and team members." />
      <EmptyState
        icon={Building2}
        title="Team management is coming next"
        description="Roles, invitations and organization details are built in a later phase."
      />
    </>
  );
}
