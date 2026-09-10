"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/**
 * Reads and writes list filters through the URL.
 *
 * Filters live in the query string rather than component state so a filtered
 * view can be bookmarked, shared with a colleague, and survives a refresh —
 * which is what people expect from a table they are working through.
 */
export function useQueryFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setFilters = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams);

      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }

      // Any change to the filters invalidates the current page number.
      params.delete("page");

      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const clearAll = useCallback(() => {
    router.push(pathname);
  }, [pathname, router]);

  return { searchParams, setFilters, clearAll };
}
