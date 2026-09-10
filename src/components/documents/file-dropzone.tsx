"use client";

import { FileText, UploadCloud, X } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";

import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Drag-and-drop plus a file picker. Client-side checks here are a convenience
 * only — every rule is enforced again on the server, which is the side that
 * decides whether a file is acceptable.
 */
export function FileDropzone({
  file,
  onSelect,
  disabled = false,
  maxBytes,
}: {
  file: File | null;
  onSelect: (file: File | null) => void;
  disabled?: boolean;
  maxBytes: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  function accept(candidate: File | undefined) {
    if (!candidate) return;

    if (!candidate.name.toLowerCase().endsWith(".pdf")) {
      setHint("Only PDF documents are currently supported.");
      return;
    }
    if (candidate.size > maxBytes) {
      setHint(
        `File is too large. The maximum size is ${formatFileSize(maxBytes)}.`,
      );
      return;
    }

    setHint(null);
    onSelect(candidate);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    accept(event.dataTransfer.files[0]);
  }

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <FileText className="size-5 text-primary" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="tabular text-xs text-muted-foreground">
            {formatFileSize(file.size)}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={() => {
            onSelect(null);
            if (inputRef.current) inputRef.current.value = "";
          }}
          aria-label="Remove selected file"
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-6 py-12 text-center transition-colors",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
          isDragging ? "border-primary bg-primary/5" : "hover:bg-muted/50",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <div className="flex size-11 items-center justify-center rounded-full bg-muted">
          <UploadCloud
            className="size-5 text-muted-foreground"
            aria-hidden="true"
          />
        </div>
        <p className="mt-4 text-sm font-medium">
          Drag a PDF here, or click to browse
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Up to {formatFileSize(maxBytes)}. Your document is stored privately and
          is never published.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          disabled={disabled}
          onChange={(event) => accept(event.target.files?.[0])}
        />
      </div>

      {hint ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
