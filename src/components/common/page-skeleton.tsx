import { Skeleton } from "@/components/ui/skeleton";

/**
 * Placeholder shown while a page's data loads.
 *
 * Mirrors the real layout — a title block, then either tiles or rows — so the
 * page does not jump when content arrives.
 */
export function PageSkeleton({
  tiles = 0,
  rows = 5,
}: {
  tiles?: number;
  rows?: number;
}) {
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>

      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      {tiles > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: tiles }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
      ) : null}

      <div className="space-y-3">
        <Skeleton className="h-10 w-full max-w-md" />
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-full" />
        ))}
      </div>
    </div>
  );
}
