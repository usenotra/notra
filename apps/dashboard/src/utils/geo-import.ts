import type { GeoImportResult } from "@notra/geo-core/types/geo-import";

import type {
  GeoCsvImportCapacity,
  GeoCsvImportPlan,
} from "@/types/components/geo";
import type { GeoImportResultPart } from "@/types/geo";

export function describeGeoImportResult(
  result: GeoImportResult
): GeoImportResultPart[] {
  const parts: GeoImportResultPart[] = [];
  if (result.imported > 0) {
    parts.push({ key: "imported", count: result.imported });
  }
  if (result.updated > 0) {
    parts.push({ key: "updated", count: result.updated });
  }
  if (result.skipped > 0) {
    parts.push({ key: "skipped", count: result.skipped });
  }
  if (parts.length === 0) {
    parts.push({ key: "nothingNew", count: 0 });
  }
  return parts;
}

export function formatCsvFileSize(bytes: number, locale: string): string {
  const format = (value: number, unit: string, maximumFractionDigits: number) =>
    new Intl.NumberFormat(locale, {
      style: "unit",
      unit,
      unitDisplay: "short",
      maximumFractionDigits,
    }).format(value);
  if (bytes < 1024) {
    return format(bytes, "byte", 0);
  }
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) {
    return format(kilobytes, "kilobyte", kilobytes < 10 ? 1 : 0);
  }
  return format(kilobytes / 1024, "megabyte", 1);
}

/**
 * Rows that update a tracked entry always fit. New rows fill whatever room is
 * left under the limit, in file order; the rest are left out so the import
 * itself never fails on the limit.
 */
export function planGeoCsvImport<TRow>(
  rows: readonly TRow[],
  capacity: GeoCsvImportCapacity<TRow> | undefined
): GeoCsvImportPlan<TRow> {
  if (!capacity) {
    return { rows: [...rows], added: rows.length, updated: 0, overLimit: 0 };
  }
  let room = Math.max(0, capacity.limit - capacity.existingKeys.size);
  const kept: TRow[] = [];
  let added = 0;
  let updated = 0;
  let overLimit = 0;
  for (const row of rows) {
    if (capacity.existingKeys.has(capacity.keyOf(row))) {
      kept.push(row);
      updated += 1;
      continue;
    }
    if (room === 0) {
      overLimit += 1;
      continue;
    }
    room -= 1;
    kept.push(row);
    added += 1;
  }
  return { rows: kept, added, updated, overLimit };
}
