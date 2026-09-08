"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

import type { UploadedDocument } from "@/components/documents/upload-form";
import { HashDisplay } from "@/components/documents/hash-display";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime, formatFileSize } from "@/lib/format";

/**
 * Shown immediately after a successful upload. The point of this screen is the
 * fingerprint: the user should see the exact value that will later be anchored,
 * before anything is published.
 */
export function UploadResult({
  document,
  onUploadAnother,
}: {
  document: UploadedDocument;
  onUploadAnother: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
          <CardTitle>Document stored and fingerprinted</CardTitle>
        </div>
        <CardDescription>
          Your document is saved privately. Nothing has been published yet —
          creating the blockchain proof is a separate, deliberate step.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">Filename</dt>
            <dd className="truncate text-sm font-medium">
              {document.filename}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Document type</dt>
            <dd className="text-sm font-medium">
              {document.documentTypeLabel}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">File size</dt>
            <dd className="tabular text-sm font-medium">
              {formatFileSize(document.fileSize)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Uploaded</dt>
            <dd className="tabular text-sm font-medium">
              {formatDateTime(document.createdAt)}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm text-muted-foreground">
              SHA-256 fingerprint
            </dt>
            <dd className="mt-1">
              <HashDisplay hash={document.sha256Hash} full />
            </dd>
          </div>
        </dl>

        <div className="flex flex-col gap-2 border-t pt-6 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onUploadAnother}>
            Upload another
          </Button>
          <Button asChild>
            <Link href="/documents">Go to documents</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
