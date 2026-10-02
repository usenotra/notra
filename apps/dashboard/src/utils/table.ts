import { GEO_VISIBILITY_TABLE_ROWS } from "@notra/geo-core/constants/geo";

import {
  TABLE_CONTENT_ROW_MAX_HEIGHT,
  TABLE_MAX_HEIGHT,
  TABLE_MIN_ROWS,
  TABLE_ROW_HEIGHT,
} from "@/constants/table";

export function tableHeightFor(
  rowCount: number,
  rowHeight = TABLE_ROW_HEIGHT
): number {
  const rows = Math.max(rowCount, TABLE_MIN_ROWS);
  return Math.min(TABLE_MAX_HEIGHT, (rows + 1) * rowHeight);
}

/**
 * Viewport for a short, content-sized table that should grow with its rows
 * instead of scrolling inside a box. Wrapped rows are taller than the fixed
 * row height, so the cap is sized for the tallest row we expect.
 */
export function contentTableHeightFor(rowCount: number): number {
  return (
    Math.max(rowCount, TABLE_MIN_ROWS) * TABLE_CONTENT_ROW_MAX_HEIGHT +
    TABLE_ROW_HEIGHT
  );
}

export function paginatedTableHeightFor(
  rowCount: number,
  rowHeight = TABLE_ROW_HEIGHT
): number {
  return (Math.max(rowCount, TABLE_MIN_ROWS) + 1) * rowHeight;
}

export const GEO_VISIBILITY_TABLE_HEIGHT = tableHeightFor(
  GEO_VISIBILITY_TABLE_ROWS
);
