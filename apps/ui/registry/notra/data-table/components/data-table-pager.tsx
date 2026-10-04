"use client";

import type { DataTablePagerProps } from "../types/data-table";
import { TablePagination } from "./data-table-pagination";

/** The footer pager every paged table shares, whatever the paging source. */
export function DataTablePager({
  pagination,
  rowCount,
  onClientPageSizeChange,
}: DataTablePagerProps) {
  const {
    page,
    pageSize,
    itemLabel,
    formatRange,
    onPageChange,
    pageSizeOptions,
  } = pagination;
  const changePageSize = pagination.onPageSizeChange ?? onClientPageSizeChange;
  // A new size reflows every page, so start over at the first one.
  const onPageSizeChange = changePageSize
    ? (next: number) => {
        changePageSize(next);
        onPageChange(1);
      }
    : undefined;

  if (pagination.mode === "cursor") {
    if (rowCount === 0 && page <= 1) {
      return null;
    }
    return (
      <TablePagination
        formatRange={formatRange}
        hasNextPage={pagination.hasNextPage}
        itemLabel={itemLabel}
        onPageSizeChange={onPageSizeChange}
        page={page}
        pageRowCount={rowCount}
        pageSizeOptions={pageSizeOptions}
        pageSize={pageSize}
        setPage={(next) => onPageChange(Math.max(1, next))}
      />
    );
  }

  const totalItems =
    pagination.mode === "server" ? pagination.totalItems : rowCount;
  if (totalItems === 0) {
    return null;
  }
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, page), pageCount);
  return (
    <TablePagination
      formatRange={formatRange}
      itemLabel={itemLabel}
      onPageSizeChange={onPageSizeChange}
      page={currentPage}
      pageCount={pageCount}
      pageRowCount={Math.min(
        pageSize,
        totalItems - (currentPage - 1) * pageSize
      )}
      pageSize={pageSize}
      pageSizeOptions={pageSizeOptions}
      setPage={(next) => onPageChange(Math.min(Math.max(1, next), pageCount))}
      totalItems={totalItems}
    />
  );
}
