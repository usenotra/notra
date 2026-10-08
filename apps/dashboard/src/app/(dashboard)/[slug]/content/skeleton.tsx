"use client";

import { DataTableSkeleton } from "@notra/ui/components/ui/data-table";

import { COLLECTION_TABLE_SKELETON_ROWS } from "@/constants/content-collections";

export function CollectionsPageSkeleton() {
  return <DataTableSkeleton rows={COLLECTION_TABLE_SKELETON_ROWS} />;
}
