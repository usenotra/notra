"use client";

import { Skeleton } from "@notra/ui/components/ui/skeleton";

export function GoogleSearchConsolePageSkeleton() {
  return (
    <div className="border-border/80 bg-muted/80 rounded-lg border p-2">
      <div className="px-2 py-1.5">
        <Skeleton className="h-6 w-48" />
      </div>
      <div className="border-border/80 bg-background space-y-3 rounded-lg border px-4 py-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}
