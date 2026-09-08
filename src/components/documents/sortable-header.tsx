"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * A column header that toggles sort order through the URL, so a sorted view is
 * shareable and survives a refresh.
 */
export function SortableHeader({
  field,
  sort,
  direction,
  children,
}: {
  field: string;
  sort: string;
  direction: "asc" | "desc";
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const active = sort === field;
  const nextDirection = active && direction === "desc" ? "asc" : "desc";
  const Icon = active
    ? direction === "desc"
      ? ArrowDown
      : ArrowUp
    : ChevronsUpDown;

  function toggle() {
    const params = new URLSearchParams(searchParams);
    params.set("sort", field);
    params.set("direction", nextDirection);
    params.delete("page"); // A re-sorted list starts from the first page.
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <TableHead
      aria-sort={
        active ? (direction === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <button
        type="button"
        onClick={toggle}
        className="-mx-1 flex items-center gap-1 rounded px-1 py-0.5 transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {children}
        <Icon
          className={cn(
            "size-3.5",
            active ? "text-foreground" : "text-muted-foreground/60",
          )}
          aria-hidden="true"
        />
      </button>
    </TableHead>
  );
}
