import type { QueryClient } from "@tanstack/react-query";

import { dashboardOrpc } from "@/lib/orpc/query";
import type { GeoQueryScope } from "@/types/geo";

/**
 * An event concerns the viewed scope when it names its project. The
 * organization-wide view (no project) follows every project, and traffic
 * without a project (legacy tokens) can show up in any scope.
 */
export function isGeoLiveEventInScope(
  projectIds: readonly string[],
  projectId: string | undefined
): boolean {
  if (!projectId) {
    return true;
  }
  return projectIds.some((id) => id === projectId || id === "");
}

export async function invalidateGeoTrafficQueries(
  queryClient: QueryClient,
  input: GeoQueryScope
) {
  await Promise.all(
    [
      dashboardOrpc.geo.aiTraffic.key({ input }),
      dashboardOrpc.geo.trafficLog.key({ input }),
      dashboardOrpc.geo.trafficPages.key({ input }),
      dashboardOrpc.geo.trafficJourneys.key({ input }),
      dashboardOrpc.geo.journeyStats.key({ input }),
      dashboardOrpc.geo.journeyDetail.key({ input }),
    ].map((queryKey) => queryClient.invalidateQueries({ queryKey }))
  );
}
