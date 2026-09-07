import { Activity } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Activity",
};

export default function Page() {
  return (
    <>
      <PageHeader title="Activity" description="A chronological record of everything that happened in your workspace." />
      <EmptyState
        icon={Activity}
        title="No activity yet"
        description="Uploads, proofs and verifications will be recorded here as your team uses ProofChain."
      />
    </>
  );
}
