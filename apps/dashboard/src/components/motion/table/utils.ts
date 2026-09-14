import type { ReactNode } from "react";

import type { TableColumn, TableRow } from "./types";

export const CHECKBOX_WIDTH = "3rem";

/** Highlights the top edge of the active column's header cell. */
export const COLUMN_ACTIVE_SHADOW = "inset 0 1px 0 var(--color-primary)";

/** Inner box for table cells. Gives children a real used width so truncate /
 * max-width:100% resolve against the column, not the td's max-w-0 hack. */
export const TABLE_CELL_INNER_CLASS =
  "w-full min-w-0 truncate [&>*]:min-w-0 [&>*]:max-w-full";

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

/** Horizontal padding of header labels (`px-4` on both sides). */
export const HEADER_PAD_X_PX = 32;
/** Sort arrow: 14px icon + 4px `gap-1`. */
export const SORT_ICON_PX = 18;
/** Reorder grip (`w-6`). */
export const REORDER_HANDLE_PX = 24;
/** Default resize/layout floor, used as `Table`'s `minColumnWidth`. */
export const DEFAULT_MIN_COLUMN_WIDTH = 64;
/** Extra `ch` so wide glyphs (M, W) are not clipped vs the `0`-width `ch` unit. */
const HEADER_CH_BUFFER = 1;

export function headerMinWidth(
  column: Pick<TableColumn<unknown>, "header" | "sortable" | "minWidth">,
  minColumnWidth: number,
  extraChromePx = 0
): string {
  if (column.minWidth) {
    return column.minWidth;
  }
  const chromePx =
    HEADER_PAD_X_PX + (column.sortable ? SORT_ICON_PX : 0) + extraChromePx;
  if (typeof column.header === "string" && column.header.length > 0) {
    return `max(${minColumnWidth}px, calc(${column.header.length + HEADER_CH_BUFFER}ch + ${chromePx}px))`;
  }
  return `${minColumnWidth}px`;
}

/** Sum of column floors so `table-layout: fixed` cannot crush titles. */
export function tableMinWidthCss<T>(
  columns: readonly Pick<TableColumn<T>, "header" | "sortable" | "minWidth">[],
  minColumnWidth: number,
  extraFixedWidths: readonly string[] = [],
  extraChromePx = 0
): string {
  const parts = [
    ...extraFixedWidths,
    ...columns.map((column) =>
      headerMinWidth(column, minColumnWidth, extraChromePx)
    ),
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
  const frValues = columns.map((column) => {
    const match = column.width ? FR_WIDTH_REGEX.exec(column.width) : null;
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
