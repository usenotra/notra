"use client";

import { cn } from "cn";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { TABLE_PAGE_SIZE_OPTIONS } from "../constants/data-table";
import type { TablePaginationRange } from "../types/data-table";
import { useDataTableLabels } from "./data-table-labels";

interface TablePaginationProps {
  page: number;
  /** Omit when only "is there a next page" is known (cursor paging). */
  pageCount?: number;
  pageSize: number;
  /** Omit when only "is there a next page" is known (cursor paging). */
  totalItems?: number;
  /** Required without `pageCount`: whether a page follows this one. */
  hasNextPage?: boolean;
  pageRowCount: number;
  setPage: (page: number) => void;
  itemLabel?: string;
  className?: string;
  formatRange?: (range: TablePaginationRange) => string;
  /** Shows a page-size select in place of the range text. */
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
}

/** The offered sizes plus the current one, so a custom default still shows. */
function pageSizeChoices(
  options: readonly number[],
  pageSize: number
): number[] {
  return [...new Set([...options, pageSize])].sort((a, b) => a - b);
}

/**
 * Footer pager: the visible range on the left, "Page 2 of 9" and prev/next on
 * the right. One shape for known and unknown totals, so every table pages the
 * same way.
 */
export function TablePagination({
  page,
  pageCount,
  pageSize,
  totalItems,
  hasNextPage = false,
  pageRowCount,
  setPage,
  itemLabel,
  className,
  formatRange,
  onPageSizeChange,
  pageSizeOptions = TABLE_PAGE_SIZE_OPTIONS,
}: TablePaginationProps) {
  const labels = useDataTableLabels();
  const locale = labels.locale ?? "en-US";
  const offset = (page - 1) * pageSize;
  const knownTotal = totalItems !== undefined;
  const total = totalItems ?? offset + pageRowCount;
  const start = total === 0 || pageRowCount === 0 ? 0 : offset + 1;
  const end = knownTotal
    ? Math.min(total, page * pageSize)
    : offset + pageRowCount;
  const isFirst = page <= 1;
  const isLast = pageCount === undefined ? !hasNextPage : page >= pageCount;
  const hasPages = !(isFirst && isLast);
  const label = itemLabel ? ` ${itemLabel}` : "";
  const startText = start.toLocaleString(locale);
  const endText = end.toLocaleString(locale);
  const pageText = page.toLocaleString(locale);
  let rangeText = labels.paginationRangeOpen(startText, endText);
  if (knownTotal) {
    rangeText = labels.paginationRange(
      startText,
      endText,
      total.toLocaleString(locale)
    );
  }
  // A size picker only helps once there is more than the smallest page.
  const smallestSize = Math.min(...pageSizeOptions, pageSize);
  const showSizeSelect =
    onPageSizeChange !== undefined &&
    (knownTotal
      ? total > smallestSize
      : hasPages || pageRowCount > smallestSize);
  const pageStatus =
    pageCount === undefined
      ? labels.pageNumber(pageText)
      : labels.pageOf(pageText, pageCount.toLocaleString(locale));

  return (
    <div
      className={cn(
        "text-muted-foreground flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-1.5 text-xs",
        className
      )}
    >
      {showSizeSelect ? (
        <Select
          onValueChange={(value) => {
            if (value) {
              onPageSizeChange(Number(value));
            }
          }}
          value={String(pageSize)}
        >
          <SelectTrigger
            aria-label={labels.rowsPerPage}
            className="hover:bg-muted aria-expanded:bg-muted dark:hover:bg-muted/50 -ml-2.5 border-transparent bg-transparent text-xs shadow-none dark:bg-transparent"
            size="sm"
          >
            <SelectValue>
              {(value: string) =>
                labels.showRows(Number(value).toLocaleString(locale))
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {pageSizeChoices(pageSizeOptions, pageSize).map((size) => (
              <SelectItem key={size} value={String(size)}>
                {labels.showRows(size.toLocaleString(locale))}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <span className="min-w-0 truncate tabular-nums">
          {formatRange
            ? formatRange({ start, end, total: knownTotal ? total : undefined })
            : `${rangeText}${label}`}
        </span>
      )}
      {hasPages ? (
        <nav
          aria-label={labels.pagination}
          className="ml-auto flex items-center gap-3"
        >
          <span aria-live="polite" className="tabular-nums">
            {pageStatus}
          </span>
          <div className="flex items-center gap-1">
            <Button
              aria-label={labels.goToPreviousPage}
              disabled={isFirst}
              onClick={() => setPage(page - 1)}
              size="icon-sm"
              variant="outline"
            >
              <ChevronLeftIcon />
            </Button>
            <Button
              aria-label={labels.goToNextPage}
              disabled={isLast}
              onClick={() => setPage(page + 1)}
              size="icon-sm"
              variant="outline"
            >
              <ChevronRightIcon />
            </Button>
          </div>
        </nav>
      ) : null}
    </div>
  );
}
