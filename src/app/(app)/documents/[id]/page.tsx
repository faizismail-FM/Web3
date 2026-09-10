import { RegistrationStatus } from "@prisma/client";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActivityTimeline } from "@/components/documents/activity-timeline";
import { HashDisplay } from "@/components/documents/hash-display";
import { QrPanel } from "@/components/documents/qr-panel";
import { ProofActions } from "@/components/documents/proof-actions";
import { DocumentStatusBadge } from "@/components/documents/status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { transactionUrl } from "@/lib/blockchain/networks";
import { can } from "@/lib/auth/rbac";
import { requireUser } from "@/lib/auth/session";
import { documentTypeLabel } from "@/lib/documents/types";
import { formatDateTime, formatFileSize, truncateHex } from "@/lib/format";
import { getDocumentForOrganization } from "@/lib/services/documents";
import { verificationUrl } from "@/lib/verification/urls";

export const metadata: Metadata = {
  title: "Document",
};

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser("/documents");
  const { id } = await params;

  const document = user.organizationId
    ? await getDocumentForOrganization(id, user.organizationId)
    : null;

  // A document belonging to another organization is indistinguishable from one
  // that does not exist.
  if (!document) notFound();

  const registration = document.registration;
  const isConfirmed = registration?.status === RegistrationStatus.CONFIRMED;
  const explorerUrl =
    registration?.transactionHash && !registration.mode.includes("MOCK")
      ? transactionUrl(registration.chainId, registration.transactionHash)
      : null;

  return (
    <>
      <PageHeader
        title={document.filename}
        description={documentTypeLabel(
          document.documentType,
          document.documentTypeLabel,
        )}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/documents">
                <ArrowLeft className="size-4" aria-hidden="true" />
                All documents
              </Link>
            </Button>
            <Button asChild variant="outline">
              <a href={`/api/documents/${document.id}/download`}>
                <Download className="size-4" aria-hidden="true" />
                Download
              </a>
            </Button>
          </>
        }
      />

      <div className="flex items-center gap-3">
        <DocumentStatusBadge status={document.status} />
        {registration?.mode === "MOCK" && isConfirmed ? (
          <span className="text-xs text-muted-foreground">
            Created in simulation mode
          </span>
        ) : null}
      </div>

      {/* Document information */}
      <Card>
        <CardHeader>
          <CardTitle>Document information</CardTitle>
          <CardDescription>
            Stored privately in your organization. Never published.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <Detail label="Filename" value={document.filename} />
            <Detail
              label="Document type"
              value={documentTypeLabel(
                document.documentType,
                document.documentTypeLabel,
              )}
            />
            <Detail label="Uploaded by" value={document.uploader.name} />
            <Detail
              label="Upload date"
              value={formatDateTime(document.createdAt)}
            />
            <Detail
              label="File size"
              value={formatFileSize(document.fileSize)}
            />
            <div className="min-w-0 sm:col-span-2">
              <dt className="text-sm text-muted-foreground">
                SHA-256 fingerprint
              </dt>
              <dd className="mt-0.5">
                <HashDisplay hash={document.sha256Hash} full />
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Blockchain proof */}
      <Card>
        <CardHeader>
          <CardTitle>Blockchain proof</CardTitle>
          <CardDescription>
            Only the fingerprint is published — never the document itself.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isConfirmed && registration ? (
            <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <Detail label="Network" value={registration.networkName ?? "—"} />
              <Detail
                label="Contract"
                value={
                  registration.contractAddress ? (
                    <span className="hash-text">
                      {truncateHex(registration.contractAddress, 10, 8)}
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
              <Detail
                label="Transaction hash"
                value={
                  registration.transactionHash ? (
                    <span className="hash-text">
                      {truncateHex(registration.transactionHash, 10, 8)}
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
              <Detail
                label="Block number"
                value={registration.blockNumber?.toString() ?? "—"}
              />
              <Detail
                label="Timestamp"
                value={
                  registration.registeredAt
                    ? formatDateTime(registration.registeredAt)
                    : "—"
                }
              />
              <Detail
                label="Issuer wallet"
                value={
                  registration.issuerAddress ? (
                    <span className="hash-text">
                      {truncateHex(registration.issuerAddress, 10, 8)}
                    </span>
                  ) : (
                    "—"
                  )
                }
              />

              <div className="sm:col-span-2">
                {explorerUrl ? (
                  <Button asChild variant="outline">
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View on blockchain explorer
                      <ExternalLink className="size-4" aria-hidden="true" />
                    </a>
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Simulated proofs have no explorer entry. Configure a real
                    network to anchor proofs publicly.
                  </p>
                )}
              </div>
            </dl>
          ) : registration?.status === RegistrationStatus.FAILED ? (
            <div className="space-y-4">
              <Alert
                variant="destructive"
                className="border-destructive/30 bg-destructive-muted text-destructive-muted-foreground"
              >
                <AlertDescription>
                  {registration.errorMessage ??
                    "The blockchain proof could not be created."}{" "}
                  Your document and its fingerprint are unaffected — you can try
                  again.
                </AlertDescription>
              </Alert>
              {can.registerOnChain(user.role) ? (
                <ProofActions
                  documentId={document.id}
                  filename={document.filename}
                  sha256Hash={document.sha256Hash}
                  retry
                />
              ) : null}
            </div>
          ) : registration?.status === RegistrationStatus.PENDING ? (
            <p className="text-sm text-muted-foreground">
              The proof is being created. Refresh in a moment.
            </p>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                No proof yet. Creating one publishes the fingerprint above,
                producing a permanent record that this document existed today
                and has not changed since.
              </p>
              {can.registerOnChain(user.role) ? (
                <ProofActions
                  documentId={document.id}
                  filename={document.filename}
                  sha256Hash={document.sha256Hash}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Viewers cannot create proofs. Ask an administrator.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification */}
      {isConfirmed && registration ? (
        <Card>
          <CardHeader>
            <CardTitle>Verification</CardTitle>
            <CardDescription>
              Share this link or QR code. Anyone can verify the document without
              an account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <QrPanel
              verificationId={registration.verificationId}
              verificationUrl={verificationUrl(registration.verificationId)}
            />
          </CardContent>
        </Card>
      ) : null}

      {/* Verification history */}
      {document.verifications.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Verification history</CardTitle>
            <CardDescription>
              When this document has been checked, and by whom.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {document.verifications.map((verification) => (
                <li
                  key={verification.id}
                  className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {verification.result === "MATCH"
                        ? "Verified successfully"
                        : verification.result === "MISMATCH"
                          ? "Document did not match"
                          : "No matching record"}
                    </p>
                    <p className="tabular text-xs text-muted-foreground">
                      {formatDateTime(verification.createdAt)} ·{" "}
                      {verification.method === "FILE_UPLOAD"
                        ? "By uploading a file"
                        : "By verification ID"}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {verification.user?.name ?? "Anonymous visitor"}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {/* Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
          <CardDescription>
            Everything that has happened to this document.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityTimeline
            entries={document.activityLogs.map((entry) => ({
              id: entry.id,
              type: entry.type,
              message: entry.message,
              createdAt: entry.createdAt,
              actor: entry.user?.name ?? null,
            }))}
          />
        </CardContent>
      </Card>
    </>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium break-words">{value}</dd>
    </div>
  );
}
