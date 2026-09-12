import { Skeleton } from "@notra/ui/components/ui/skeleton";

import type { SentimentSkeletonProps } from "@/types/geo-sentiment";

export function SentimentSkeleton({ compact = false }: SentimentSkeletonProps) {
  if (compact) {
    return (
      <div className="space-y-6" role="status" aria-label="Loading sentiment">
        <div className="space-y-3">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-3 w-40" />
        </div>
        <div className="space-y-3 py-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-2 w-full" />
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-4" role="status" aria-label="Loading sentiment">
      <Skeleton className="h-52 w-full" />
    </div>
  );
}
