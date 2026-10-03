"use client";

import { AnalyticsUpIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { DataTable } from "@notra/ui/components/ui/data-table";
import { useTranslations } from "next-intl";

import { EmptyState } from "@/components/empty-state";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import type { DataTableProps as LogsDataTableProps } from "@/types/logs/data-table";
import { paginatedTableHeightFor } from "@/utils/table";

const LOGS_SKELETON_ROW_COUNT = 10;

export function LogsDataTable<TData>({
  columns,
  data,
  getRowId,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  isLoading,
  emptyState,
  onRowClick,
  sort,
  onSortChange,
  totalCount,
}: LogsDataTableProps<TData>) {
  const t = useTranslations("settings.logs");
  // Paged tables size to their page; only the first load needs room for
  // skeleton rows.
  const skeletonHeight =
    isLoading && data.length === 0
      ? paginatedTableHeightFor(LOGS_SKELETON_ROW_COUNT, TABLE_ROW_HEIGHT)
      : undefined;

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
    <DataTable
      columns={columns}
      data={data}
      defaultSort={{ key: "createdAt", direction: "desc" }}
      emptyState={t("noResults")}
      pagination={{
        mode: "server",
        page,
        pageSize,
        totalItems: totalCount,
        onPageChange,
        onPageSizeChange,
        itemLabel: t("itemLabel"),
      }}
      getRowId={getRowId}
      height={skeletonHeight}
      loading={isLoading}
      onRowClick={onRowClick}
      onSortChange={onSortChange}
      rowHeight={TABLE_ROW_HEIGHT}
      sort={sort}
    />
  );
}
