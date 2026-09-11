import { GEO_SCAN_PREFLIGHT_NEVER_SCANNED } from "@notra/geo-core/constants/geo";

import { formatRelative } from "@/utils/format-relative";
import { formatEngineFamily } from "@/utils/geo-charts";

export function scanPreflightEngineNames(engines: readonly string[]): string[] {
  return [...new Set(engines.map((engine) => formatEngineFamily(engine)))];
}

export function formatScanPreflightLastScan(lastScanAt: string | null): string {
  if (!lastScanAt) {
    return GEO_SCAN_PREFLIGHT_NEVER_SCANNED;
  }
  return formatRelative(lastScanAt);
}

/** `undefined` means run every tracked engine. Empty selection is not a payload. */
export function scanPreflightEnginesToSubmit(
  tracked: readonly string[],
  selected: ReadonlySet<string>
): string[] | undefined {
  const engines = tracked.filter((engine) => selected.has(engine));
  if (engines.length === 0 || engines.length === tracked.length) {
    return undefined;
  }
  return engines;
}
