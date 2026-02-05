"use client";

import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useId } from "react";

export function GitHubIntegrationDetailSkeleton() {
  const id = useId();
  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <div className="space-y-1">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-80" />
        </div>
        <div className="rounded-[20px] border border-border/80 bg-muted/80 p-2">
          <div className="px-2 py-1.5">
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="space-y-3 rounded-[12px] border border-border/80 bg-background px-4 py-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton
                className={`h-4 ${i === 2 ? "w-2/3" : "w-full"}`}
                key={`${id}-line1-${i}`}
              />
            ))}
          </div>
        </div>
        <div className="rounded-[20px] border border-border/80 bg-muted/80 p-2">
          <div className="px-2 py-1.5">
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="space-y-3 rounded-[12px] border border-border/80 bg-background px-4 py-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton
                className={`h-4 ${i === 4 ? "w-2/3" : "w-full"}`}
                key={`${id}-line2-${i}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
