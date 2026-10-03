import { GEO_CHECK_AGGREGATE_CACHE } from "@notra/db/constants/geo-check-cache";
import type { GeoSettingsResponse } from "@notra/geo-core/types/geo";
import type { QueryClient } from "@tanstack/react-query";

import { dashboardOrpc } from "@/lib/orpc/query";
import type { GeoQueryScope } from "@/types/geo";

export async function invalidateGeoScanResultQueries(
  queryClient: QueryClient,
  input: GeoQueryScope
) {
  const invalidate = () =>
    Promise.all(
      [
        dashboardOrpc.geo.sentiment.key({ input }),
        dashboardOrpc.geo.sentimentEvidence.key({ input }),
        dashboardOrpc.geo.sentimentAnalysis.key({ input }),
        dashboardOrpc.geo.scanRuns.key({ input }),
        dashboardOrpc.geo.scanRun.key({ input }),
        dashboardOrpc.geo.overview.key({ input }),
        dashboardOrpc.geo.timeseries.key({ input }),
        dashboardOrpc.geo.promptResultSummaries.key({ input }),
        dashboardOrpc.geo.changes.key({ input }),
        dashboardOrpc.geo.promptHistory.key({ input }),
        dashboardOrpc.geo.competitorShare.key({ input }),
        dashboardOrpc.geo.competitorDetail.key({ input }),
        dashboardOrpc.geo.languageShare.key({ input }),
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
    await invalidateGeoScanResultQueries(queryClient, {
      organizationId,
      projectId,
    });
  }
}
