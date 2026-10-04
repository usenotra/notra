import { log } from "@notra/ai/evlog";
import { createRouterClient } from "@orpc/server";
import { dehydrate } from "@tanstack/react-query";

import { geoDbQueryKey } from "@/lib/db/geo-collections";
import { createORPCContext } from "@/lib/orpc/context";
import { dashboardOrpc } from "@/lib/orpc/query";
import { contentRouter } from "@/lib/orpc/routers/content";
import { geoRouter } from "@/lib/orpc/routers/geo";
import type { LoadedMembership } from "@/types/auth/organization";
import { prefetchRecentPostsQuery } from "@/utils/content-recents-prefetch.server";
import { getGeoServerQueryClient } from "@/utils/geo-query-client.server";
import { seedMembership } from "@/utils/seed-membership.server";

/**
 * The request logs only show how long the whole page stream stayed open, so
 * each prefetch reports its own duration to find the one holding it.
 */
function timedPrefetch<T>(query: string, run: () => Promise<T>) {
  return async () => {
    const startedAt = performance.now();
    let outcome: "success" | "error" = "error";
    try {
      const result = await run();
      outcome = "success";
      return result;
    } finally {
      log.info({
        event: "dashboard.home.prefetch.completed",
        surface: "dashboard-home",
        query,
        outcome,
        durationMs: Math.round(performance.now() - startedAt),
      });
    }
  };
}

/**
 * Loads the dashboard home data on the server. The route streams, so the
 * shell never waits for it; the home body is awaited so it is part of the
 * server HTML, while the projects and recents queries are dehydrated pending
 * and the browser reuses them instead of starting its own requests.
 */
export async function dehydrateDashboardHomeQueries(
  organizationId: string,
  projectId: string | undefined,
  requestHeaders: Headers,
  membership?: LoadedMembership
) {
  await seedMembership(organizationId, requestHeaders, membership);

  const client = createRouterClient(
    { content: contentRouter, geo: geoRouter },
    { context: () => createORPCContext({ headers: requestHeaders }) }
  );
  const queryClient = getGeoServerQueryClient();
  const organizationInput = { organizationId };
  const homeInput = {
    ...organizationInput,
    projectId,
  };

  void queryClient.prefetchQuery({
    queryKey: geoDbQueryKey("projects", organizationInput),
    queryFn: timedPrefetch(
      "geo.projectsList",
      async () => (await client.geo.projectsList(organizationInput)).projects
    ),
  });
  // The home body is awaited (the route streams, so the shell does not wait)
  // and renders in the server HTML; sidebar data below stays pending.
  const homeBody = Promise.all([
    queryClient.prefetchQuery({
      ...dashboardOrpc.content.home.get.queryOptions({ input: homeInput }),
      queryFn: timedPrefetch("content.home.get", () =>
        client.content.home.get(homeInput)
      ),
    }),
    queryClient.prefetchQuery({
      ...dashboardOrpc.content.activeGenerations.list.queryOptions({
        input: organizationInput,
      }),
      queryFn: timedPrefetch("content.activeGenerations.list", () =>
        client.content.activeGenerations.list(organizationInput)
      ),
    }),
  ]);
  prefetchRecentPostsQuery(
    queryClient,
    (input) =>
      timedPrefetch("content.recents", () => client.content.recents(input))(),
    organizationId,
    projectId
  );
  await homeBody;
  return dehydrate(queryClient);
}
