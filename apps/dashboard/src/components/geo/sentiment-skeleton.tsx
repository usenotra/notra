import { Skeleton } from "@notra/ui/components/ui/skeleton";

import type { SentimentSkeletonProps } from "@/types/geo-sentiment";

export function SentimentSkeleton({ compact = false }: SentimentSkeletonProps) {
  if (compact) {
    return (
      <div
        className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-[auto_minmax(0,1fr)]"
        role="status"
        aria-label="Loading sentiment"
      >
        <div className="space-y-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-3 w-40" />
        </div>
        <div className="space-y-2 self-center">
          <Skeleton className="h-3 w-20" />
          <div className="flex justify-between">
            <Skeleton className="h-2 w-3" />
            <Skeleton className="h-2 w-4" />
            <Skeleton className="h-2 w-5" />
          </div>
          <Skeleton className="h-2 w-full" />
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-4" role="status" aria-label="Loading sentiment">
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
