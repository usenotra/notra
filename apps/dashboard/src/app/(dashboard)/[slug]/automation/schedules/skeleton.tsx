"use client";

import { DataTableSkeleton } from "@notra/ui/components/ui/data-table";
import { Skeleton } from "@notra/ui/components/ui/skeleton";

export function SchedulePageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-48" />
      <DataTableSkeleton rows={5} />
    </div>
  );
}
