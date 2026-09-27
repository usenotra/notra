import type { GeoImportResult } from "@notra/geo-core/types/geo-import";

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
