import { CopyButton } from "@/components/common/copy-button";
import { HashDisplay } from "@/components/documents/hash-display";
import { DocumentStatusBadge } from "@/components/documents/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { documentTypeLabel } from "@/lib/documents/types";
import { formatDate, formatFileSize } from "@/lib/format";
import type { DocumentListItem } from "@/lib/services/documents";
import { publicEnv } from "@/lib/env";
import { SortableHeader } from "@/components/documents/sortable-header";

export function DocumentsTable({
  documents,
  sort,
  direction,
}: {
  documents: DocumentListItem[];
  sort: string;
  direction: "asc" | "desc";
}) {
  const networkLabel = publicEnv.blockchainMode === "real" ? "Base Sepolia" : "Not registered";

  return (
    // Wide tables scroll inside their own container so the page body never
    // scrolls horizontally on a narrow screen.
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <SortableHeader field="filename" sort={sort} direction={direction}>
              Document
            </SortableHeader>
            <SortableHeader
              field="documentType"
              sort={sort}
              direction={direction}
            >
              Type
            </SortableHeader>
            <TableHead>Uploaded by</TableHead>
            <SortableHeader field="status" sort={sort} direction={direction}>
              Status
            </SortableHeader>
            <TableHead>Fingerprint</TableHead>
            <SortableHeader field="createdAt" sort={sort} direction={direction}>
              Uploaded
            </SortableHeader>
            <TableHead>Blockchain</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {documents.map((document) => (
            <TableRow key={document.id}>
              <TableCell className="max-w-64">
                <p className="truncate font-medium" title={document.filename}>
                  {document.filename}
                </p>
                <p className="tabular text-xs text-muted-foreground">
                  {formatFileSize(document.fileSize)}
                </p>
              </TableCell>

              <TableCell className="whitespace-nowrap text-muted-foreground">
                {documentTypeLabel(
                  document.documentType,
                  document.documentTypeLabel,
                )}
              </TableCell>

              <TableCell className="whitespace-nowrap text-muted-foreground">
                {document.uploader.name}
              </TableCell>

              <TableCell>
                <DocumentStatusBadge status={document.status} />
              </TableCell>

              <TableCell>
                <HashDisplay hash={document.sha256Hash} />
              </TableCell>

              <TableCell className="tabular whitespace-nowrap text-muted-foreground">
                {formatDate(document.createdAt)}
              </TableCell>

              <TableCell className="whitespace-nowrap text-muted-foreground">
                {document.registration?.transactionHash
                  ? (document.registration.networkName ?? networkLabel)
                  : "—"}
              </TableCell>

              <TableCell className="text-right">
                {document.registration?.verificationId ? (
                  <CopyButton
                    value={document.registration.verificationId}
                    label="Copy ID"
                    copiedLabel="Copied"
                    variant="ghost"
                  />
                ) : (
                  // Creating a proof happens from the document detail page,
                  // which arrives in a later phase.
                  <span className="text-xs text-muted-foreground">
                    Awaiting proof
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
