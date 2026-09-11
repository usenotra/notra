"use client";

import { Skeleton } from "@notra/ui/components/ui/skeleton";

import { Table } from "@/components/motion/table";
import {
  TABLE_ROW_HEIGHT,
  TABLE_SKELETON_COLUMN_WIDTHS,
  TABLE_SKELETON_ROWS,
} from "@/constants/table";
import type { TableSkeletonProps } from "@/types/table";
import { tableHeightFor } from "@/utils/table";

export function TableSkeleton({
  columnWidths = TABLE_SKELETON_COLUMN_WIDTHS,
  rows = TABLE_SKELETON_ROWS,
  rowHeight = TABLE_ROW_HEIGHT,
  className,
}: TableSkeletonProps) {
  return (
    <Table
      className={className}
      columns={columnWidths.map((width, index) => ({
        key: `skeleton-column-${index}`,
        header: <Skeleton className="h-4 w-16" />,
        width,
      }))}
      data={[]}
      height={tableHeightFor(rows, rowHeight)}
      loading
      rowHeight={rowHeight}
    />
  );
}
