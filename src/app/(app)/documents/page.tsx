import { FileText, Upload } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { Pagination } from "@/components/common/pagination";
import { DocumentsTable } from "@/components/documents/documents-table";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { can } from "@/lib/auth/rbac";
import { requireUser } from "@/lib/auth/session";
import { listDocuments } from "@/lib/services/documents";
import { documentListQuerySchema } from "@/lib/validation/documents";

export const metadata: Metadata = {
  title: "Documents",
};

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser("/documents");
  const params = await searchParams;

  // Unparseable query strings fall back to defaults rather than erroring; a
  // hand-edited URL should not break the page.
  const parsed = documentListQuerySchema.safeParse(params);
  const query = parsed.success
    ? parsed.data
    : documentListQuerySchema.parse({});

  const { documents, pagination } = user.organizationId
    ? await listDocuments(user.organizationId, query)
    : { documents: [], pagination: { page: 1, pageSize: query.pageSize, total: 0, totalPages: 1 } };

  const uploadButton = can.uploadDocuments(user.role) ? (
    <Button asChild>
      <Link href="/documents/new">
        <Upload className="size-4" aria-hidden="true" />
        Upload document
      </Link>
    </Button>
  ) : null;

  return (
    <>
      <PageHeader
        title="Documents"
        description="Every document your organization has registered, with its fingerprint and proof status."
        actions={uploadButton}
      />

      {documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents yet"
          description="Upload a PDF to compute its fingerprint. You can create a blockchain proof for it afterwards."
          action={uploadButton}
        />
      ) : (
        <div className="space-y-4">
          {/* useSearchParams in the table header requires a Suspense boundary. */}
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <DocumentsTable
              documents={documents}
              sort={query.sort}
              direction={query.direction}
            />
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              pageSize={pagination.pageSize}
            />
          </Suspense>
        </div>
      )}
    </>
  );
}
