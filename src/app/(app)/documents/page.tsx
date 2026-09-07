import { FileText } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Documents",
};

export default function Page() {
  return (
    <>
      <PageHeader title="Documents" description="Every document your organization has registered, with its status and proof." />
      <EmptyState
        icon={FileText}
        title="No documents yet"
        description="Once you upload a document it will appear here with its fingerprint and blockchain status."
      />
    </>
  );
}
