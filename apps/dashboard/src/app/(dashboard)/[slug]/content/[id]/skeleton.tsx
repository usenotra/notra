"use client";

import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useId } from "react";

export function ContentDetailSkeleton() {
  const id = useId();
  return (
    <div className="flex flex-1 flex-col" role="status">
      <span className="sr-only">Loading content</span>
      <div
        aria-hidden="true"
        className="bg-secondary sticky top-0 z-20 flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 lg:px-6"
      >
        <div className="bg-secondary pointer-events-none absolute inset-x-0 top-full h-4">
          <div className="bg-background h-full rounded-t-2xl" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-36" />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-7 w-20" />
        </div>
      </div>
      <div aria-hidden="true" className="flex flex-1 flex-col py-4 md:py-6">
        <div className="mx-auto w-full max-w-5xl px-4 lg:px-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-full md:h-9" />
            <Skeleton className="h-8 w-2/3 md:h-9" />
          </div>
          <div className="mt-4 space-y-2">
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="mt-8 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton
                className={`h-4 ${i === 7 ? "w-2/3" : "w-full"}`}
                key={`${id}-line-${i}`}
              />
            ))}
          </div>
          <Skeleton className="mt-8 h-7 w-1/2" />
          <div className="mt-4 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    </div>
  );
}
