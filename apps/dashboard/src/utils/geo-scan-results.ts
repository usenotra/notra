import { GEO_CHECK_AGGREGATE_CACHE } from "@notra/db/constants/geo-check-cache";
import type { GeoSettingsResponse } from "@notra/geo-core/types/geo";
import type { QueryClient } from "@tanstack/react-query";

import { dashboardOrpc } from "@/lib/orpc/query";

export async function invalidateGeoScanResultQueries(queryClient: QueryClient) {
  const invalidate = () =>
    Promise.all(
      [
        dashboardOrpc.geo.sentiment.key(),
        dashboardOrpc.geo.sentimentEvidence.key(),
        dashboardOrpc.geo.sentimentAnalysis.key(),
        dashboardOrpc.geo.scanRuns.key(),
        dashboardOrpc.geo.scanRun.key(),
        dashboardOrpc.geo.overview.key(),
        dashboardOrpc.geo.timeseries.key(),
        dashboardOrpc.geo.promptResultSummaries.key(),
        dashboardOrpc.geo.promptResultDetail.key(),
        dashboardOrpc.geo.changes.key(),
        dashboardOrpc.geo.promptHistory.key(),
        dashboardOrpc.geo.competitorShare.key(),
        dashboardOrpc.geo.competitorDetail.key(),
        dashboardOrpc.geo.languageShare.key(),
      ].map((queryKey) => queryClient.invalidateQueries({ queryKey }))
    );

  await invalidate();
  // A completion refetch can still hit pre-scan aggregates. Refetch once more
  // after their TTL, even though settings polling has stopped. Inactive queries
  // are only marked stale, so navigating away does not trigger requests.
  setTimeout(() => {
    invalidate().catch(() => undefined);
  }, GEO_CHECK_AGGREGATE_CACHE.config.ex * 1000);
}

// A quick rescan can complete before settings ever report `isScanning`.
export async function refreshSettingsAfterScanStart(
  queryClient: QueryClient,
  organizationId: string,
  projectId: string | undefined
) {
  const settingsKey = dashboardOrpc.geo.settings.queryKey({
    input: { organizationId, projectId },
  });
  await queryClient.invalidateQueries({ queryKey: settingsKey });
  const settings = queryClient.getQueryData<GeoSettingsResponse>(settingsKey);
  if (!settings?.settings?.isScanning) {
    await invalidateGeoScanResultQueries(queryClient);
  }
}
