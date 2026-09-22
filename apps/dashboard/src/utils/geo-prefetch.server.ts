import { createRouterClient } from "@orpc/server";
import { dehydrate } from "@tanstack/react-query";

import { createORPCContext } from "@/lib/orpc/context";
import { dashboardOrpc } from "@/lib/orpc/query";
import { geoRouter } from "@/lib/orpc/routers/geo";
import type { OrganizationMembership } from "@/types/auth/organization";
import {
  geoHydrationInputs,
  geoTrafficHydrationInputs,
} from "@/utils/geo-hydration";
import { getGeoServerQueryClient } from "@/utils/geo-query-client.server";
import { geoSettingsQueryInput } from "@/utils/geo-query-input";

/**
 * Settings is the gate on every GEO page. Prefetching it from the layout means
 * the client does not spend a round trip on a skeleton before the page query.
 */
export async function dehydrateGeoSettingsQuery(
  organizationId: string,
  projectId: string | undefined,
  requestHeaders: Headers,
  membership?: OrganizationMembership & { userId: string }
) {
  if (membership) {
    const { requestMemo } = await createORPCContext({
      headers: requestHeaders,
    });
    requestMemo.membershipByUserOrganization.set(
      `${membership.userId}:${organizationId}`,
      Promise.resolve({ id: membership.id, role: membership.role })
    );
  }

  const client = createRouterClient(
    { geo: geoRouter },
    { context: () => createORPCContext({ headers: requestHeaders }) }
  );
  const queryClient = getGeoServerQueryClient();
  const input = geoSettingsQueryInput({ organizationId, projectId });

  void queryClient.prefetchQuery({
    ...dashboardOrpc.geo.settings.queryOptions({ input }),
    queryFn: () => client.geo.settings(input),
  });

  return dehydrate(queryClient);
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
  const input = geoHydrationInputs(organizationId, projectId, search);
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

async function openGeoReadClient(
  requestHeaders: Headers,
  organizationId: string,
  membership?: OrganizationMembership & { userId: string }
) {
  if (membership) {
    const { requestMemo } = await createORPCContext({
      headers: requestHeaders,
    });
    requestMemo.membershipByUserOrganization.set(
      `${membership.userId}:${organizationId}`,
      Promise.resolve({ id: membership.id, role: membership.role })
    );
  }

  const client = createRouterClient(
    { geo: geoRouter },
    { context: () => createORPCContext({ headers: requestHeaders }) }
  );
  return { client, queryClient: getGeoServerQueryClient() };
}

export async function dehydrateGeoScopeList(
  procedure:
    | "agentReadiness"
    | "personasList"
    | "writerBriefsList"
    | "writerGaps",
  organizationId: string,
  projectId: string | undefined,
  requestHeaders: Headers,
  membership?: OrganizationMembership & { userId: string }
) {
  const { client, queryClient } = await openGeoReadClient(
    requestHeaders,
    organizationId,
    membership
  );
  const input = geoSettingsQueryInput({ organizationId, projectId });

  if (procedure === "agentReadiness") {
    void queryClient.prefetchQuery({
      ...dashboardOrpc.geo.agentReadiness.queryOptions({ input }),
      queryFn: () => client.geo.agentReadiness(input),
    });
  } else if (procedure === "personasList") {
    void queryClient.prefetchQuery({
      ...dashboardOrpc.geo.personasList.queryOptions({ input }),
      queryFn: () => client.geo.personasList(input),
    });
  } else if (procedure === "writerBriefsList") {
    void queryClient.prefetchQuery({
      ...dashboardOrpc.geo.writerBriefsList.queryOptions({ input }),
      queryFn: () => client.geo.writerBriefsList(input),
    });
  } else {
    void queryClient.prefetchQuery({
      ...dashboardOrpc.geo.writerGaps.queryOptions({ input }),
      queryFn: () => client.geo.writerGaps(input),
    });
  }

  return dehydrate(queryClient);
}

export async function dehydrateGeoPromptResults(
  organizationId: string,
  projectId: string | undefined,
  search: Record<string, string | string[] | undefined>,
  requestHeaders: Headers,
  membership?: OrganizationMembership & { userId: string }
) {
  const { client, queryClient } = await openGeoReadClient(
    requestHeaders,
    organizationId,
    membership
  );
  const input = geoHydrationInputs(
    organizationId,
    projectId,
    search
  ).promptResultSummaries;

  void queryClient.prefetchQuery({
    ...dashboardOrpc.geo.promptResultSummaries.queryOptions({ input }),
    queryFn: () => client.geo.promptResultSummaries(input),
  });

  return dehydrate(queryClient);
}

export async function dehydrateGeoCompetitorShare(
  organizationId: string,
  projectId: string | undefined,
  search: Record<string, string | string[] | undefined>,
  requestHeaders: Headers,
  membership?: OrganizationMembership & { userId: string }
) {
  const { client, queryClient } = await openGeoReadClient(
    requestHeaders,
    organizationId,
    membership
  );
  const input = geoHydrationInputs(
    organizationId,
    projectId,
    search
  ).competitorShare;

  void queryClient.prefetchQuery({
    ...dashboardOrpc.geo.competitorShare.queryOptions({ input }),
    queryFn: () => client.geo.competitorShare(input),
  });

  return dehydrate(queryClient);
}
