"use client";

import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useId } from "react";

export function ContentPageSkeleton() {
  const id = useId();
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-64" />
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            className="flex flex-col rounded-[20px] border border-border/80 bg-muted/80 p-2"
            key={`${id}-card-${i}`}
          >
            <div className="flex items-center justify-between gap-4 px-2 py-1.5">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="space-y-2 rounded-[12px] border border-border/80 bg-background px-4 py-3">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
