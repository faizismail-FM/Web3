"use client";

import { X } from "lucide-react";

import { FilterSelect } from "@/components/common/filter-select";
import { SearchInput } from "@/components/common/search-input";
import { Button } from "@/components/ui/button";
import { useQueryFilters } from "@/hooks/use-query-filters";
import { ACTIVITY_GROUPS } from "@/lib/validation/activity";

const GROUP_OPTIONS = Object.entries(ACTIVITY_GROUPS).map(([value, group]) => ({
  value,
  label: group.label,
}));

export function ActivityFilters() {
  const { searchParams, setFilters, clearAll } = useQueryFilters();

  const q = searchParams.get("q") ?? "";
  const group = searchParams.get("group") ?? undefined;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <SearchInput
        value={q}
        onChange={(next) => setFilters({ q: next })}
        label="Search activity"
        placeholder="Search activity"
      />

      <FilterSelect
        label="Filter by activity type"
        value={group}
        onChange={(next) => setFilters({ group: next })}
        options={GROUP_OPTIONS}
        anyLabel="All activity"
        className="w-full sm:w-56"
      />

      {q || group ? (
        <Button variant="ghost" size="sm" onClick={clearAll}>
          <X className="size-3.5" aria-hidden="true" />
          Clear
        </Button>
      ) : null}
    </div>
  );
}
