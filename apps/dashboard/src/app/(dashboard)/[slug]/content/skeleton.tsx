"use client";

import { Skeleton } from "@notra/ui/components/ui/skeleton";

import { GeoTableSkeleton } from "@/components/geo/skeleton-parts";
import {
  COLLECTION_GRID_SKELETON_KEYS,
  COLLECTION_TABLE_SKELETON_ROWS,
} from "@/constants/content-collections";
import type { CollectionsSkeletonProps } from "@/types/content/collection";

export function CollectionsPageSkeleton({
  view = "list",
}: CollectionsSkeletonProps) {
  if (view === "grid") {
    return (
      <div
        aria-label="Loading content"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
        role="status"
      >
        {COLLECTION_GRID_SKELETON_KEYS.map((key) => (
          <Skeleton className="h-40 rounded-xl" key={key} />
        ))}
      </div>
    );
  }
  return <GeoTableSkeleton rows={COLLECTION_TABLE_SKELETON_ROWS} />;
}
