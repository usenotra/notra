import { Skeleton } from "@notra/ui/components/ui/skeleton";

import type { SentimentSkeletonProps } from "@/types/geo-sentiment";

export function SentimentSkeleton({ compact = false }: SentimentSkeletonProps) {
  return (
    <div className="space-y-4" role="status" aria-label="Loading sentiment">
      <Skeleton className="h-7 w-32" />
      <Skeleton className={compact ? "h-3 w-full" : "h-64 w-full"} />
      {compact ? (
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : null}
    </div>
  );
}
