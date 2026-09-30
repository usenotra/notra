import { GEO_VISIBILITY_TABLE_ROWS } from "@notra/geo-core/constants/geo";

import {
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

export function paginatedTableHeightFor(
  rowCount: number,
  rowHeight = TABLE_ROW_HEIGHT
): number {
  return (Math.max(rowCount, TABLE_MIN_ROWS) + 1) * rowHeight;
}

export const GEO_VISIBILITY_TABLE_HEIGHT = tableHeightFor(
  GEO_VISIBILITY_TABLE_ROWS
);
