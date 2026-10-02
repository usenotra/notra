"use client";

import { AnalyticsUpIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { TablePagination } from "@notra/ui/components/shared/table-pagination";
import { useTranslations } from "use-intl";

import { EmptyState } from "@/components/empty-state";
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
  const t = useTranslations("settings.logs");
  const totalItems = totalCount ?? data.length;
  const rowCount =
    isLoading && data.length === 0 ? LOGS_SKELETON_ROW_COUNT : data.length;

  if (data.length === 0 && !isLoading && emptyState) {
    return (
      <EmptyState
        actionLabel={emptyState.actionLabel}
        actionVariant="outline"
        className="min-h-64"
        description={emptyState.description ?? ""}
        onActionClick={emptyState.onActionClick}
        title={emptyState.title}
        titleIcon={
          <HugeiconsIcon
            aria-hidden="true"
            className="text-muted-foreground size-5"
            icon={AnalyticsUpIcon}
          />
        }
      />
    );
  }

  return (
    <Table
      className="rounded-2xl"
      columns={columns}
      data={data}
      defaultSort={{ key: "createdAt", direction: "desc" }}
      emptyState={t("noResults")}
      footer={
        totalPages > 1 || data.length > 0 ? (
          <TablePagination
            itemLabel={t("itemLabel")}
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
