import type { GeoScanRunSummary } from "@notra/geo-core/types/geo-scan-history";

export function geoRunProgress(run: GeoScanRunSummary) {
  const total = run.plan?.totalChecks;
  return total ? Math.min(100, (run.checks / total) * 100) : null;
}

export function geoRunMissingAnswers(run: GeoScanRunSummary) {
  return run.status === "running" || run.plan === null
    ? 0
    : Math.max(0, run.plan.totalChecks - run.checks);
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
