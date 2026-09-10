"use client";

import { DocumentStatus, DocumentType } from "@prisma/client";
import { X } from "lucide-react";

import { FilterSelect } from "@/components/common/filter-select";
import { SearchInput } from "@/components/common/search-input";
import { Button } from "@/components/ui/button";
import { useQueryFilters } from "@/hooks/use-query-filters";
import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_OPTIONS,
} from "@/lib/documents/types";

const STATUS_OPTIONS = [
  DocumentStatus.DRAFT,
  DocumentStatus.PENDING,
  DocumentStatus.REGISTERED,
  DocumentStatus.VERIFIED,
  DocumentStatus.FAILED,
].map((status) => ({ value: status, label: DOCUMENT_STATUS_LABELS[status] }));

const TYPE_OPTIONS = DOCUMENT_TYPE_OPTIONS.map((type: DocumentType) => ({
  value: type,
  label: DOCUMENT_TYPE_LABELS[type],
}));

export function DocumentFilters() {
  const { searchParams, setFilters, clearAll } = useQueryFilters();

  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? undefined;
  const type = searchParams.get("type") ?? undefined;
  const hasFilters = Boolean(q || status || type);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <SearchInput
        value={q}
        onChange={(next) => setFilters({ q: next })}
        label="Search documents"
        placeholder="Filename, verification ID, or fingerprint"
      />

      <FilterSelect
        label="Filter by status"
        value={status}
        onChange={(next) => setFilters({ status: next })}
        options={STATUS_OPTIONS}
        anyLabel="Any status"
        className="w-full sm:w-44"
      />

      <FilterSelect
        label="Filter by document type"
        value={type}
        onChange={(next) => setFilters({ type: next })}
        options={TYPE_OPTIONS}
        anyLabel="Any type"
        className="w-full sm:w-52"
      />

      {hasFilters ? (
        <Button variant="ghost" size="sm" onClick={clearAll}>
          <X className="size-3.5" aria-hidden="true" />
          Clear
        </Button>
      ) : null}
    </div>
  );
}
