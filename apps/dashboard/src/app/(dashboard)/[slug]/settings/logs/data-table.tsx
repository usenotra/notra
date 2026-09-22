"use client";

import { TablePagination } from "@notra/ui/components/shared/table-pagination";

import { Button } from "@/components/button";
import { Table } from "@/components/motion/table";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import type { DataTableProps } from "@/types/logs/data-table";
import { tableHeightFor } from "@/utils/table";

const LOGS_SKELETON_ROW_COUNT = 10;

export function DataTable<TData>({
  columns,
  data,
  getRowId,
  page,
  pageSize,
  totalPages,
  onPageChange,
  isLoading,
  emptyState,
  onRowClick,
  sort,
  onSortChange,
  totalCount,
}: DataTableProps<TData>) {
  const totalItems = totalCount ?? data.length;
  const rowCount =
    isLoading && data.length === 0 ? LOGS_SKELETON_ROW_COUNT : data.length;

  return (
    <Table
      className="rounded-2xl"
      columns={columns}
      data={data}
      defaultSort={{ key: "createdAt", direction: "desc" }}
      emptyState={
        emptyState ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-2 text-center">
            <p className="text-sm font-medium">{emptyState.title}</p>
            {emptyState.description && (
              <p className="text-muted-foreground text-sm">
                {emptyState.description}
              </p>
            )}
            {emptyState.actionLabel && emptyState.onActionClick && (
              <Button
                className="mt-2"
                onClick={emptyState.onActionClick}
                size="sm"
                type="button"
                variant="outline"
              >
                {emptyState.actionLabel}
              </Button>
            )}
          </div>
        ) : (
          "No results."
        )
      }
      footer={
        totalPages > 1 || data.length > 0 ? (
          <TablePagination
            itemLabel="logs"
            page={page}
            pageCount={totalPages}
            pageRowCount={data.length}
            pageSize={pageSize}
            setPage={onPageChange}
            totalItems={totalItems}
          />
        ) : undefined
      }
      getRowId={getRowId}
      height={tableHeightFor(rowCount, TABLE_ROW_HEIGHT)}
      loading={isLoading}
      onRowClick={onRowClick}
      onSortChange={onSortChange}
      rowHeight={TABLE_ROW_HEIGHT}
      sort={sort}
    />
  );
}
