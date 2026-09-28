"use client";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@notra/ui/components/ui/pagination";
import { useUiLabels } from "@notra/ui/components/shared/ui-labels-provider";
import { getPageNumbers } from "@notra/ui/lib/get-page-numbers";
import { cn } from "@notra/ui/lib/utils";
import type { TablePaginationRange } from "@notra/ui/types/table-pagination";

interface TablePaginationProps {
  page: number;
  pageCount: number;
  pageSize: number;
  totalItems: number;
  pageRowCount: number;
  setPage: (page: number) => void;
  itemLabel?: string;
  className?: string;
  /** Numbered page links. Hide in compact footers that only need prev/next. */
  showPageNumbers?: boolean;
  formatRange?: (range: TablePaginationRange) => string;
}

export function TablePagination({
  page,
  pageCount,
  pageSize,
  totalItems,
  setPage,
  itemLabel,
  className,
  showPageNumbers = true,
  formatRange,
}: TablePaginationProps) {
  const labels = useUiLabels();
  const locale = labels.locale ?? "en-US";
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(totalItems, page * pageSize);
  const isFirst = page <= 1;
  const isLast = page >= pageCount;
  const label = itemLabel ? ` ${itemLabel}` : "";

  return (
    <div
      className={cn(
        "text-muted-foreground flex min-h-11 items-center justify-between gap-3 px-3 text-xs",
        className
      )}
    >
      <span className="truncate tabular-nums">
        {formatRange
          ? formatRange({ start, end, total: totalItems })
          : `${labels.paginationRange(
              start.toLocaleString(locale),
              end.toLocaleString(locale),
              totalItems.toLocaleString(locale)
            )}${label}`}
      </span>
      {pageCount > 1 ? (
        <Pagination
          aria-label={labels.pagination}
          className="mx-0 w-auto justify-end"
        >
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                aria-disabled={isFirst}
                aria-label={labels.goToPreviousPage}
                className={cn(isFirst && "pointer-events-none opacity-50")}
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  if (!isFirst) {
                    setPage(page - 1);
                  }
                }}
                tabIndex={isFirst ? -1 : undefined}
              />
            </PaginationItem>
            {(showPageNumbers ? getPageNumbers(page, pageCount) : []).map(
              (pageNumber, index) => (
                <PaginationItem
                  key={
                    pageNumber === "ellipsis"
                      ? index === 1
                        ? "ellipsis-start"
                        : "ellipsis-end"
                      : pageNumber
                  }
                >
                  {pageNumber === "ellipsis" ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      className="tabular-nums"
                      href="#"
                      isActive={pageNumber === page}
                      onClick={(event) => {
                        event.preventDefault();
                        setPage(pageNumber);
                      }}
                    >
                      {pageNumber}
                    </PaginationLink>
                  )}
                </PaginationItem>
              )
            )}
            <PaginationItem>
              <PaginationNext
                aria-disabled={isLast}
                aria-label={labels.goToNextPage}
                className={cn(isLast && "pointer-events-none opacity-50")}
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  if (!isLast) {
                    setPage(page + 1);
                  }
                }}
                tabIndex={isLast ? -1 : undefined}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  );
}
