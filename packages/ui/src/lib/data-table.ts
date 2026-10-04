import type {
  TableColumn,
  TableLoadingOverlay,
  TableRow,
  TableViewportLayout,
  TableViewportLayoutOptions,
} from "@notra/ui/types/data-table";
import type { ReactNode } from "react";

import {
  HEADER_CH_BUFFER,
  HEADER_PAD_X_PX,
  HINT_ICON_PX,
  TABLE_PAGE_SIZE_OPTIONS,
  SORT_ICON_PX,
} from "@notra/ui/constants/table";




export function alignFlex(align: TableColumn<unknown>["align"]) {
  if (align === "right") {
    return "justify-end";
  }
  if (align === "center") {
    return "justify-center";
  }
  return "justify-start";
}

export function alignText(align: TableColumn<unknown>["align"]) {
  if (align === "right") {
    return "text-right";
  }
  if (align === "center") {
    return "text-center";
  }
  return "text-left";
}

export function readCell<T>(row: T, column: TableColumn<T>): ReactNode {
  if (column.cell) {
    return column.cell(row);
  }
  return (row as Record<string, ReactNode>)[column.key];
}

export function readSortValue<T>(
  row: T,
  column: TableColumn<T>
): string | number {
  if (column.sortValue) {
    return column.sortValue(row);
  }
  return (row as Record<string, string | number>)[column.key] ?? "";
}

/** Slice `rows` to the current page; unpaged when `pageSize` is unset. */
export function pageRows<T>(
  rows: TableRow<T>[],
  page: number,
  pageSize?: number
): TableRow<T>[] {
  if (pageSize == null) {
    return rows;
  }
  const pageStart = Math.max(0, page - 1) * pageSize;
  return rows.slice(pageStart, pageStart + pageSize);
}

/** After column sort, move matching rows to the front without pinning them sticky. */
export function pinRowsFirst<T>(
  rows: readonly TableRow<T>[],
  isRowPinned?: (row: T) => boolean
): TableRow<T>[] {
  if (!isRowPinned) {
    return [...rows];
  }
  const pinned: TableRow<T>[] = [];
  const rest: TableRow<T>[] = [];
  for (const entry of rows) {
    if (isRowPinned(entry.row)) {
      pinned.push(entry);
    } else {
      rest.push(entry);
    }
  }
  return pinned.length === 0 ? [...rows] : [...pinned, ...rest];
}

const FR_WIDTH_REGEX = /^([\d.]+)fr$/;

const PERCENT_DECIMALS = 4;

export function isFrWidth(width: string | undefined): boolean {
  return width != null && FR_WIDTH_REGEX.test(width);
}

export function headerMinWidth(
  column: Pick<
    TableColumn<unknown>,
    "header" | "hint" | "sortable" | "minWidth"
  >,
  minColumnWidth: number
): string {
  if (column.minWidth) {
    return column.minWidth;
  }
  const chromePx =
    HEADER_PAD_X_PX +
    (column.sortable ? SORT_ICON_PX : 0) +
    (column.hint ? HINT_ICON_PX : 0);
  if (typeof column.header === "string" && column.header.length > 0) {
    return `max(${minColumnWidth}px, calc(${column.header.length + HEADER_CH_BUFFER}ch + ${chromePx}px))`;
  }
  return `${minColumnWidth}px`;
}

/** Sum of column floors so `table-layout: fixed` cannot crush titles. */
export function tableMinWidthCss<T>(
  columns: readonly Pick<
    TableColumn<T>,
    "header" | "hint" | "sortable" | "minWidth"
  >[],
  minColumnWidth: number,
  extraFixedWidths: readonly string[] = []
): string {
  const parts = [
    ...extraFixedWidths,
    ...columns.map((column) => headerMinWidth(column, minColumnWidth)),
  ];
  if (parts.length === 0) {
    return "0px";
  }
  if (parts.length === 1) {
    return parts[0] ?? "0px";
  }
  return `calc(${parts.join(" + ")})`;
}

export function colWidthStyle(
  width: string | undefined,
  flexible: boolean,
  minWidth: string
): { width?: string; minWidth: string } {
  if (!width) {
    return { minWidth };
  }
  if (flexible) {
    return { width, minWidth };
  }
  return { width, minWidth: `max(${width}, ${minWidth})` };
}

export function resolveColumnWidths<T>(
  columns: readonly TableColumn<T>[],
  extraFixedWidths: readonly string[] = []
): (string | undefined)[] {
  const hasFr = columns.some((column) => isFrWidth(column.width));
  // Next to fr columns, a column without a width takes one share of the
  // rest instead of collapsing to nothing under `table-layout: fixed`.
  const frValues = columns.map((column) => {
    if (!column.width) {
      return hasFr ? 1 : null;
    }
    const match = FR_WIDTH_REGEX.exec(column.width);
    return match ? Number.parseFloat(match[1] ?? "0") : null;
  });
  const totalFr = frValues.reduce<number>(
    (sum, value) => sum + (value ?? 0),
    0
  );
  if (totalFr === 0) {
    return columns.map((column) => column.width);
  }

  const fixedWidths = [
    ...extraFixedWidths,
    ...columns.flatMap((column, index) =>
      frValues[index] == null && column.width ? [column.width] : []
    ),
  ];
  const remainder =
    fixedWidths.length > 0 ? `100% - ${fixedWidths.join(" - ")}` : null;

  return columns.map((column, index) => {
    const fr = frValues[index];
    if (fr === null || fr === undefined) {
      return column.width;
    }
    if (!remainder) {
      return `${((fr / totalFr) * 100).toFixed(PERCENT_DECIMALS)}%`;
    }
    return `calc((${remainder}) * ${fr} / ${totalFr})`;
  });
}

/** Dim existing rows, append skeletons for load-more, or fill an empty table. */
export function tableLoadingOverlay(
  loading: boolean,
  rowCount: number,
  loadingMoreProp: boolean | undefined,
  hasEndReached: boolean
): TableLoadingOverlay {
  const hasRows = rowCount > 0;
  const loadingMore = loading && hasRows && (loadingMoreProp ?? hasEndReached);
  const dimRows = loading && hasRows && !loadingMore;
  if (dimRows) {
    return { loadingMore, dimRows, loadingState: "dimmed" };
  }
  if (loadingMore) {
    return { loadingMore, dimRows, loadingState: "more" };
  }
  if (loading) {
    return { loadingMore, dimRows, loadingState: "skeleton" };
  }
  return { loadingMore, dimRows, loadingState: undefined };
}


export function getTableViewportLayout({
  rowCount,
  rowHeight,
  rowSizing,
  height,
  minHeight,
  autoHeight = false,
  horizontalScrollbarHeight,
}: TableViewportLayoutOptions): TableViewportLayout {
  const resolvedHeight = Math.max(height, minHeight ?? 0);
  // Fixed viewports end on a whole row so separators meet the bottom border.
  const bodyHeight =
    Math.floor(Math.max(rowHeight, resolvedHeight - rowHeight) / rowHeight) *
    rowHeight;
  const minBodyHeight =
    minHeight == null
      ? 0
      : Math.floor(Math.max(rowHeight, minHeight - rowHeight) / rowHeight) *
        rowHeight;
  const contentHeight = Math.max(
    rowHeight,
    Math.min(bodyHeight, rowCount * rowHeight)
  );
  const contentSized = rowSizing === "content";
  const scrolls = !contentSized && rowCount * rowHeight > bodyHeight;
  const viewportHeight = scrolls
    ? bodyHeight
    : Math.max(rowCount === 0 ? bodyHeight : contentHeight, minBodyHeight);
  const scrollbarGutter = contentSized || scrolls ? "stable" : undefined;

  if (contentSized && autoHeight && rowCount > 0) {
    return {
      bodyHeight,
      scrolls: false,
      overflowClass: "overflow-x-auto overflow-y-hidden",
      headerStyle: undefined,
      bodyStyle: { minHeight: minBodyHeight },
    };
  }

  return {
    bodyHeight,
    scrolls,
    overflowClass:
      scrolls || contentSized
        ? "overflow-auto"
        : "overflow-x-auto overflow-y-hidden",
    headerStyle: scrollbarGutter ? { scrollbarGutter } : undefined,
    bodyStyle:
      contentSized && rowCount > 0
        ? {
            scrollbarGutter,
            maxHeight: bodyHeight + horizontalScrollbarHeight,
            minHeight: minBodyHeight,
          }
        : {
            scrollbarGutter,
            height: viewportHeight + horizontalScrollbarHeight,
          },
  };
}


/**
 * A page size from an untrusted source (URL, storage) snapped to one of the
 * offered sizes, so `?pageSize=0` or `?pageSize=9999` can't break paging or a
 * request with a bounded limit.
 */
export function normalizePageSize(
  value: number,
  fallback: number,
  options: readonly number[] = TABLE_PAGE_SIZE_OPTIONS
): number {
  return options.includes(value) ? value : fallback;
}

/** Class and inline style shared by the header and body `<table>`s. */
export function tableLayout<T>(
  columns: readonly TableColumn<T>[],
  widths: Record<string, number>,
  minColumnWidth: number,
  extraFixedWidths: readonly string[]
) {
  // Shrink-wrap only after every column has an explicit resized width.
  const sized =
    columns.length > 0 && columns.every((column) => widths[column.key] != null);
  return {
    className: sized ? "w-max min-w-full" : "w-full",
    style: {
      tableLayout: "fixed" as const,
      minWidth: tableMinWidthCss(columns, minColumnWidth, extraFixedWidths),
    },
  };
}
