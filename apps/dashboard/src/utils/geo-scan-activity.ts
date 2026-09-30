import { GEO_SCAN_RESULTS_PAGE_SIZE } from "@notra/geo-core/constants/geo-scan-history";
import type { GeoScanRunSummary } from "@notra/geo-core/types/geo-scan-history";

import type {
  ScanRunDetailView,
  ScanRunDetailViewInput,
} from "@/types/geo-scan-activity";
import { paginatedTableHeightFor } from "@/utils/table";

export function geoRunProgress(run: GeoScanRunSummary) {
  const total = run.plan?.totalChecks;
  return total ? Math.min(100, (run.checks / total) * 100) : null;
}

export function geoRunMissingAnswers(run: GeoScanRunSummary) {
  return run.status === "running" || run.plan === null
    ? 0
    : Math.max(0, run.plan.totalChecks - run.checks);
}

export function scanRunDetailView(
  input: ScanRunDetailViewInput
): ScanRunDetailView {
  const pendingTotal = input.data?.pendingTotal ?? 0;
  const pending = input.data?.pending ?? [];
  const results = input.data?.results ?? [];
  const activeView = pendingTotal > 0 ? input.view : "answers";
  const engines = input.run.plan?.engines ?? [];
  const rowCount = activeView === "pending" ? pending.length : results.length;
  return {
    running: input.run.status === "running",
    pendingTotal,
    pending,
    results,
    activeView,
    showLanguage: (input.run.plan?.languages.length ?? 0) > 1,
    loading: input.isPending || input.isPlaceholderData,
    hasFilters: pendingTotal > 0 || engines.length > 1,
    engines,
    height: paginatedTableHeightFor(
      input.isPending ? GEO_SCAN_RESULTS_PAGE_SIZE / 2 : rowCount
    ),
    pendingOffset: input.data?.pendingOffset ?? input.pendingOffset,
    total: input.data?.total ?? 0,
    answerCount: input.data?.total ?? input.run.checks,
  };
}

export function formatGeoRunDuration(
  startedAt: string,
  finishedAt: string | null,
  now: number
) {
  const seconds = Math.max(
    0,
    Math.floor(
      ((finishedAt ? Date.parse(finishedAt) : now) - Date.parse(startedAt)) /
        1000
    )
  );
  if (seconds < 60) {
    return `${seconds}s`;
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  }
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}
