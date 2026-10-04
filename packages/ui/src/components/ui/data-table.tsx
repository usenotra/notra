"use client";

import { DataTableRoot } from "@notra/ui/components/data-table/root";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import {
  TABLE_SKELETON_COLUMN_WIDTHS,
  TABLE_SKELETON_ROW_COUNT,
  TABLE_SKELETON_ROW_HEIGHT,
} from "@notra/ui/constants/table";
import type {
  DataTablePagination,
  DataTableProps,
  DataTableSkeletonProps,
  InfiniteDataTableProps,
} from "@notra/ui/types/data-table";

export type {
  DataTablePagination,
  DataTableProps,
  InfiniteDataTableProps,
  SortState,
  TableColumn,
} from "@notra/ui/types/data-table";

/** The app's table: sortable, selectable, paged or bounded with a scrolling body. */
function DataTable<T>(props: DataTableProps<T>) {
  return <DataTableRoot {...props} />;
}

/** A fixed-height, virtualized table that asks for the next page near the bottom. */
function InfiniteDataTable<T>(props: InfiniteDataTableProps<T>) {
  return <DataTableRoot {...props} rowSizing="fixed" />;
}

/** Loading placeholder with the same chrome as a real table. */
function DataTableSkeleton({
  columnWidths = TABLE_SKELETON_COLUMN_WIDTHS,
  rows = TABLE_SKELETON_ROW_COUNT,
  rowHeight = TABLE_SKELETON_ROW_HEIGHT,
  toolbar,
  className,
}: DataTableSkeletonProps) {
  return (
    <DataTableRoot
      className={className}
      columns={columnWidths.map((width, index) => ({
        key: `skeleton-column-${String(index)}`,
        header: <Skeleton className="h-3.5 w-16" />,
        width,
      }))}
      data={[]}
      height={(rows + 1) * rowHeight}
      loading
      rowHeight={rowHeight}
      scrollFade={false}
      toolbar={toolbar}
    />
  );
}

export { DataTable, DataTableSkeleton, InfiniteDataTable };
