import { createRouterClient } from "@orpc/server";
import { dehydrate } from "@tanstack/react-query";

import { assertOrganizationAccess } from "@/lib/auth/organization";
import { resolveGeoEntitlement } from "@/lib/billing/subscription";
import { createORPCContext } from "@/lib/orpc/context";
import { dashboardOrpc } from "@/lib/orpc/query";
import { contentRouter } from "@/lib/orpc/routers/content";
import { geoRouter } from "@/lib/orpc/routers/geo";
import { prefetchRecentPostsQuery } from "@/utils/content-recents-prefetch.server";
import {
  geoHydrationInputs,
  geoTrafficHydrationInputs,
} from "@/utils/geo-hydration";
import { getGeoServerQueryClient } from "@/utils/geo-query-client.server";

async function canPrefetchGeoQueries(organizationId: string, headers: Headers) {
  await createORPCContext({ headers });
  // Authorization is mandatory even when the optional billing prefetch fails.
  await assertOrganizationAccess({ organizationId, headers });
  try {
    return (await resolveGeoEntitlement(organizationId, headers)) !== "denied";
  } catch (error) {
    console.warn("[geo] Skipping prefetch: entitlement lookup unavailable", {
      organizationId,
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return false;
  }
}

/**
 * Starts the GEO overview queries on the server and returns the dehydrated
 * cache. The queries are intentionally not awaited: the query client dehydrates
 * pending queries, so the shell streams while they resolve.
 */
export async function dehydrateGeoOverviewQueries(
  organizationId: string,
  projectId: string | undefined,
  search: Record<string, string | string[] | undefined>,
  requestHeaders: Headers
) {
  if (!(await canPrefetchGeoQueries(organizationId, requestHeaders))) {
    return dehydrate(getGeoServerQueryClient());
  }
  const input = geoHydrationInputs(organizationId, projectId, search);
  const client = createRouterClient(
    { content: contentRouter, geo: geoRouter },
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

  // The remaining queries only mount on specific tabs (see
  // `useGeoOverviewPage`); prefetching them for another tab would be wasted.
  if (input.activeTab === "journeys") {
    void queryClient.prefetchQuery({
      ...dashboardOrpc.geo.trafficJourneys.queryOptions({
        input: input.trafficJourneys,
      }),
      queryFn: () => client.geo.trafficJourneys(input.trafficJourneys),
    });
    void queryClient.prefetchQuery({
      ...dashboardOrpc.geo.journeyStats.queryOptions({
        input: input.journeyStats,
      }),
      queryFn: () => client.geo.journeyStats(input.journeyStats),
    });
  }
  if (input.activeTab === "visibility") {
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

  prefetchRecentPostsQuery(
    queryClient,
    (recentsInput) => client.content.recents(recentsInput),
    organizationId,
    projectId
  );

  return dehydrate(queryClient);
}

/**
 * Same non-blocking prefetch for the GEO traffic page: settings, the AI
 * traffic overview, top pages, the live log and the ingest setup all start on
 * the server so the page hydrates instead of cascading skeletons.
 */
export async function dehydrateGeoTrafficQueries(
  organizationId: string,
  projectId: string | undefined,
  search: Record<string, string | string[] | undefined>,
  requestHeaders: Headers
) {
  if (!(await canPrefetchGeoQueries(organizationId, requestHeaders))) {
    return dehydrate(getGeoServerQueryClient());
  }
  const input = geoTrafficHydrationInputs(organizationId, projectId, search);
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
    ...dashboardOrpc.geo.aiTraffic.queryOptions({ input: input.aiTraffic }),
    queryFn: () => client.geo.aiTraffic(input.aiTraffic),
  });
  void queryClient.prefetchQuery({
    ...dashboardOrpc.geo.trafficPages.queryOptions({
      input: input.trafficPages,
    }),
    queryFn: () => client.geo.trafficPages(input.trafficPages),
  });
  void queryClient.prefetchQuery({
    ...dashboardOrpc.geo.trafficLog.queryOptions({ input: input.trafficLog }),
    queryFn: () => client.geo.trafficLog(input.trafficLog),
  });
  void queryClient.prefetchQuery({
    ...dashboardOrpc.geo.ingestSetup.queryOptions({ input: input.ingestSetup }),
    queryFn: () => client.geo.ingestSetup(input.ingestSetup),
  });

  return dehydrate(queryClient);
}
