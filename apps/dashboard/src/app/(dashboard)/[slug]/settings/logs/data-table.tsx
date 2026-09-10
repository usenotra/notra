"use client";

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
  totalPages,
  onPageChange,
  isLoading,
  emptyState,
  onRowClick,
  sort,
  onSortChange,
  totalCount,
}: DataTableProps<TData>) {
  const rowCount = isLoading ? LOGS_SKELETON_ROW_COUNT : data.length;

  return (
    <div>
      <Table
        className="rounded-2xl"
        columns={columns}
        data={data}
        defaultSort={{ key: "createdAt", direction: "desc" }}
        sort={sort}
        onSortChange={onSortChange}
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
        getRowId={getRowId}
        height={tableHeightFor(rowCount, TABLE_ROW_HEIGHT)}
        loading={isLoading}
        onRowClick={onRowClick}
        rowHeight={TABLE_ROW_HEIGHT}
      />
      {(totalPages > 1 || data.length > 0) && (
        <div className="flex items-center justify-between py-4">
          <span className="text-muted-foreground text-sm">
            Page {page} of {totalPages}
            {totalCount !== undefined ? ` · ${totalCount} logs` : ""}
          </span>
          <div className="flex items-center space-x-2">
            <Button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              size="sm"
              variant="outline"
            >
              Previous
            </Button>
            <Button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              size="sm"
              variant="outline"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
