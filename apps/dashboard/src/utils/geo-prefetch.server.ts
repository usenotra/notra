import { createRouterClient } from "@orpc/server";
import { dehydrate } from "@tanstack/react-query";

import { createORPCContext } from "@/lib/orpc/context";
import { dashboardOrpc } from "@/lib/orpc/query";
import { geoRouter } from "@/lib/orpc/routers/geo";
import { geoHydrationInputs } from "@/utils/geo-hydration";
import { getGeoServerQueryClient } from "@/utils/geo-query-client.server";

/**
 * Starts the GEO overview queries on the server and returns the dehydrated
 * cache. The queries are intentionally not awaited: the query client dehydrates
 * pending queries, so the shell streams while they resolve.
 */
export async function dehydrateGeoOverviewQueries(
  organizationId: string,
  search: Record<string, string | string[] | undefined>,
  requestHeaders: Headers
) {
  const input = geoHydrationInputs(organizationId, search);
  const client = createRouterClient(
    { geo: geoRouter },
    { context: () => createORPCContext({ headers: requestHeaders }) }
  );
  const queryClient = getGeoServerQueryClient();

  void queryClient.prefetchQuery({
    ...dashboardOrpc.geo.settings.queryOptions({ input: input.settings }),
    queryFn: () => client.geo.settings(input.settings),
  });
  void queryClient.prefetchQuery({
    ...dashboardOrpc.geo.overview.queryOptions({ input: input.overview }),
    queryFn: () => client.geo.overview(input.overview),
  });
  void queryClient.prefetchQuery({
    ...dashboardOrpc.geo.timeseries.queryOptions({ input: input.timeseries }),
    queryFn: () => client.geo.timeseries(input.timeseries),
  });
  void queryClient.prefetchQuery({
    ...dashboardOrpc.geo.promptsList.queryOptions({ input: input.prompts }),
    queryFn: () => client.geo.promptsList(input.prompts),
  });
  void queryClient.prefetchQuery({
    ...dashboardOrpc.geo.competitors.queryOptions({ input: input.competitors }),
    queryFn: () => client.geo.competitors(input.competitors),
  });

  // Tab-specific queries mirror `useGeoOverviewPage` enablement.
  if (input.activeTab === "journeys") {
    void queryClient.prefetchQuery({
      ...dashboardOrpc.geo.trafficJourneys.queryOptions({
        input: input.trafficJourneys,
      }),
      queryFn: () => client.geo.trafficJourneys(input.trafficJourneys),
    });
  }
  if (input.activeTab === "visibility" || input.activeTab === "prompts") {
    void queryClient.prefetchQuery({
      ...dashboardOrpc.geo.promptResultSummaries.queryOptions({
        input: input.promptResultSummaries,
      }),
      queryFn: () =>
        client.geo.promptResultSummaries(input.promptResultSummaries),
    });
  }
  if (input.activeTab === "visibility") {
    void queryClient.prefetchQuery({
      ...dashboardOrpc.geo.competitorShare.queryOptions({
        input: input.competitorShare,
      }),
      queryFn: () => client.geo.competitorShare(input.competitorShare),
    });
    void queryClient.prefetchQuery({
      ...dashboardOrpc.geo.languageShare.queryOptions({
        input: input.languageShare,
      }),
      queryFn: () => client.geo.languageShare(input.languageShare),
    });
  }

  return dehydrate(queryClient);
}
