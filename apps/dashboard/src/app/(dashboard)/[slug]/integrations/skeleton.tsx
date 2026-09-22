"use client";

import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useId } from "react";

export function IntegrationsPageSkeleton() {
  const id = useId();
  return (
    <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          className="border-border/80 bg-muted/80 rounded-lg border p-2"
          key={`${id}-card-${i}`}
        >
          <div className="px-2 py-1.5">
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="border-border/80 bg-background space-y-3 rounded-lg border px-4 py-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
