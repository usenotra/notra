"use client";

import { Skeleton } from "@notra/ui/components/ui/skeleton";

import { TableSkeleton } from "@/components/table-skeleton";

export function EventsPageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-48" />
      <TableSkeleton />
    </div>
  );
}
