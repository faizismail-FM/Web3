import { ArrowLeft, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { UploadForm } from "@/components/documents/upload-form";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { can } from "@/lib/auth/rbac";
import { requireUser } from "@/lib/auth/session";
import { getServerEnv } from "@/lib/env";

export const metadata: Metadata = {
  title: "Register a document",
};

export default async function NewDocumentPage() {
  const user = await requireUser("/documents/new");
  const maxBytes = getServerEnv().MAX_UPLOAD_BYTES;

  return (
    <>
      <PageHeader
        title="Register a document"
        description="Upload a PDF. We compute its fingerprint on our servers — the document itself is never published."
        actions={
          <Button asChild variant="outline">
            <Link href="/documents">
              <ArrowLeft className="size-4" aria-hidden="true" />
              All documents
            </Link>
          </Button>
        }
      />

      {can.uploadDocuments(user.role) ? (
        <Card>
          <CardHeader>
            <CardTitle>Upload</CardTitle>
            <CardDescription>
              PDF only for now. Nothing is published until you explicitly create
              a blockchain proof.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UploadForm maxBytes={maxBytes} />
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon={Lock}
          title="You do not have permission to upload"
          description="Viewers can read documents but cannot add new ones. Ask an administrator to change your role."
        />
      )}
    </>
  );
}
