"use client";

import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { useUiLabels } from "@notra/ui/components/shared/ui-labels-provider";
import { Button } from "@notra/ui/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { TABLE_PAGE_SIZE_OPTIONS } from "@notra/ui/constants/table";
import { cn } from "@notra/ui/lib/utils";
import type { TablePaginationRange } from "@notra/ui/types/table-pagination";

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

/** Visible row range for a page; `total` is unknown with cursor paging. */
function pageRange(
  page: number,
  pageSize: number,
  pageRowCount: number,
  totalItems: number | undefined
): TablePaginationRange {
  const offset = (page - 1) * pageSize;
  if (totalItems === undefined) {
    return {
      start: pageRowCount === 0 ? 0 : offset + 1,
      end: offset + pageRowCount,
    };
  }
  return {
    start: totalItems === 0 || pageRowCount === 0 ? 0 : offset + 1,
    end: Math.min(totalItems, page * pageSize),
    total: totalItems,
  };
}

function RangeText({
  range,
  itemLabel,
  formatRange,
}: {
  range: TablePaginationRange;
  itemLabel?: string;
  formatRange?: (range: TablePaginationRange) => string;
}) {
  const labels = useUiLabels();
  const locale = labels.locale ?? "en-US";
  let text = formatRange?.(range);
  if (text === undefined) {
    const start = range.start.toLocaleString(locale);
    const end = range.end.toLocaleString(locale);
    const base =
      range.total === undefined
        ? labels.paginationRangeOpen(start, end)
        : labels.paginationRange(start, end, range.total.toLocaleString(locale));
    text = itemLabel ? `${base} ${itemLabel}` : base;
  }
  return <span className="min-w-0 truncate tabular-nums">{text}</span>;
}

function PageSizeSelect({
  pageSize,
  options,
  onPageSizeChange,
}: {
  pageSize: number;
  options: readonly number[];
  onPageSizeChange: (pageSize: number) => void;
}) {
  const labels = useUiLabels();
  const locale = labels.locale ?? "en-US";
  return (
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
        className="-ml-2.5 text-xs"
        size="sm"
        variant="ghost"
      >
        <SelectValue>
          {(value: string) =>
            labels.showRows(Number(value).toLocaleString(locale))
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {pageSizeChoices(options, pageSize).map((size) => (
          <SelectItem key={size} value={String(size)}>
            {labels.showRows(size.toLocaleString(locale))}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function PageControls({
  page,
  pageCount,
  isFirst,
  isLast,
  setPage,
}: {
  page: number;
  pageCount?: number;
  isFirst: boolean;
  isLast: boolean;
  setPage: (page: number) => void;
}) {
  const labels = useUiLabels();
  const locale = labels.locale ?? "en-US";
  const pageText = page.toLocaleString(locale);
  return (
    <nav
      aria-label={labels.pagination}
      className="ml-auto flex items-center gap-3"
    >
      <span aria-live="polite" className="tabular-nums">
        {pageCount === undefined
          ? labels.pageNumber(pageText)
          : labels.pageOf(pageText, pageCount.toLocaleString(locale))}
      </span>
      <div className="flex items-center gap-1">
        <Button
          aria-label={labels.goToPreviousPage}
          disabled={isFirst}
          onClick={() => setPage(page - 1)}
          size="icon-sm"
          variant="outline"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
        </Button>
        <Button
          aria-label={labels.goToNextPage}
          disabled={isLast}
          onClick={() => setPage(page + 1)}
          size="icon-sm"
          variant="outline"
        >
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
        </Button>
      </div>
    </nav>
  );
}

/**
 * Footer pager: the page-size select (or the visible range) on the left,
 * "Page 2 of 9" and prev/next on the right. One shape for known and unknown
 * totals, so every table pages the same way.
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
  const range = pageRange(page, pageSize, pageRowCount, totalItems);
  const isFirst = page <= 1;
  const isLast = pageCount === undefined ? !hasNextPage : page >= pageCount;
  const hasPages = !(isFirst && isLast);
  // A size picker only helps once there is more than the smallest page.
  const smallestSize = Math.min(...pageSizeOptions, pageSize);
  const hasMoreThanSmallest =
    range.total === undefined
      ? hasPages || pageRowCount > smallestSize
      : range.total > smallestSize;

  return (
    <div
      className={cn(
        "text-muted-foreground flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-1.5 text-xs",
        className
      )}
    >
      {onPageSizeChange && hasMoreThanSmallest ? (
        <PageSizeSelect
          onPageSizeChange={onPageSizeChange}
          options={pageSizeOptions}
          pageSize={pageSize}
        />
      ) : (
        <RangeText
          formatRange={formatRange}
          itemLabel={itemLabel}
          range={range}
        />
      )}
      {hasPages ? (
        <PageControls
          isFirst={isFirst}
          isLast={isLast}
          page={page}
          pageCount={pageCount}
          setPage={setPage}
        />
      ) : null}
    </div>
  );
}
