"use client";

import { DocumentType } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Field } from "@/components/auth/field";
import { FormError } from "@/components/auth/form-error";
import { FileDropzone } from "@/components/documents/file-dropzone";
import { UploadResult } from "@/components/documents/upload-result";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ApiClientError } from "@/lib/api/client";
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_OPTIONS,
} from "@/lib/documents/types";

export type UploadedDocument = {
  id: string;
  filename: string;
  documentTypeLabel: string;
  fileSize: number;
  sha256Hash: string;
  status: string;
  createdAt: string;
};

export function UploadForm({ maxBytes }: { maxBytes: number }) {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>(
    DocumentType.BILL_OF_LADING,
  );
  const [customLabel, setCustomLabel] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiClientError | null>(null);
  const [result, setResult] = useState<UploadedDocument | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!file) {
      setError({ message: "Choose a document to upload.", fields: {} });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("documentType", documentType);
    if (documentType === DocumentType.OTHER && customLabel.trim()) {
      formData.append("documentTypeLabel", customLabel.trim());
    }

    setPending(true);
    // Sent as multipart rather than JSON, so `apiFetch` (which sets a JSON
    // content type) is bypassed here in favour of a direct fetch.
    try {
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        setError({
          message:
            body?.error?.message ?? "Upload failed. Please try again.",
          fields: body?.error?.fields ?? {},
        });
        return;
      }

      setResult(body.data.document);
      router.refresh();
    } catch {
      setError({
        message: "Could not reach the server. Check your connection and retry.",
        fields: {},
      });
    } finally {
      setPending(false);
    }
  }

  if (result) {
    return (
      <UploadResult
        document={result}
        onUploadAnother={() => {
          setResult(null);
          setFile(null);
          setCustomLabel("");
        }}
      />
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <FormError message={error?.message ?? null} />

      <FileDropzone
        file={file}
        onSelect={setFile}
        disabled={pending}
        maxBytes={maxBytes}
      />

      <Field id="documentType" label="Document type">
        <Select
          value={documentType}
          onValueChange={(value) => setDocumentType(value as DocumentType)}
          disabled={pending}
        >
          <SelectTrigger id="documentType" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_TYPE_OPTIONS.map((type) => (
              <SelectItem key={type} value={type}>
                {DOCUMENT_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {documentType === DocumentType.OTHER ? (
        <Field
          id="documentTypeLabel"
          label="What kind of document is this?"
          error={error?.fields.documentTypeLabel}
          hint="Optional. Used in place of “Other” wherever this document is listed."
        >
          <Input
            id="documentTypeLabel"
            value={customLabel}
            onChange={(event) => setCustomLabel(event.target.value)}
            placeholder="Customs Declaration"
            disabled={pending}
          />
        </Field>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending || !file}>
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Uploading and fingerprinting
            </>
          ) : (
            "Upload document"
          )}
        </Button>
      </div>
    </form>
  );
}
