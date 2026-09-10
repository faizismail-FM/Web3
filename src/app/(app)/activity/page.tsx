import { Activity, SearchX } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { ActivityFeed } from "@/components/activity/activity-feed";
import { ActivityFilters } from "@/components/activity/activity-filters";
import { EmptyState } from "@/components/common/empty-state";
import { Pagination } from "@/components/common/pagination";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth/session";
import { listActivity } from "@/lib/services/activity";
import { activityListQuerySchema } from "@/lib/validation/activity";

export const metadata: Metadata = {
  title: "Activity",
};

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser("/activity");
  const params = await searchParams;

  const parsed = activityListQuerySchema.safeParse(params);
  const query = parsed.success
    ? parsed.data
    : activityListQuerySchema.parse({});

  const { entries, pagination } = user.organizationId
    ? await listActivity(user.organizationId, query)
    : {
        entries: [],
        pagination: {
          page: 1,
          pageSize: query.pageSize,
          total: 0,
          totalPages: 1,
        },
      };

  const hasFilters = Boolean(query.q || query.group);

  return (
    <>
      <PageHeader
        title="Activity"
        description="A chronological record of everything that has happened in your workspace."
      />

      {entries.length === 0 && !hasFilters ? (
        <EmptyState
          icon={Activity}
          title="No activity yet"
          description="Uploads, proofs and verifications will be recorded here as your team uses ProofChain."
        />
      ) : (
        <div className="space-y-4">
          <Suspense fallback={<Skeleton className="h-10 w-full" />}>
            <ActivityFilters />
          </Suspense>

          {entries.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No activity matches those filters"
              description="Try a different search term, or clear the filters to see everything."
            />
          ) : (
            <Suspense fallback={<Skeleton className="h-64 w-full" />}>
              <ActivityFeed entries={entries} />
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                pageSize={pagination.pageSize}
              />
            </Suspense>
          )}
        </div>
      )}
    </>
  );
}
