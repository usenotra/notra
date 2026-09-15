import { log } from "@notra/ai/evlog";
import { createRouterClient } from "@orpc/server";
import { dehydrate } from "@tanstack/react-query";

import { geoDbQueryKey } from "@/lib/db/geo-collections";
import { createORPCContext } from "@/lib/orpc/context";
import { dashboardOrpc } from "@/lib/orpc/query";
import { contentRouter } from "@/lib/orpc/routers/content";
import { geoRouter } from "@/lib/orpc/routers/geo";
import type { OrganizationMembership } from "@/types/auth/organization";
import { getGeoServerQueryClient } from "@/utils/geo-query-client.server";

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
 * Starts the data needed above the fold on the dashboard home page while the
 * server is already rendering it. Pending queries are dehydrated, so the shell
 * can stream immediately and the browser reuses the work instead of starting a
 * projects request followed by a second content request.
 */
export async function dehydrateDashboardHomeQueries(
  organizationId: string,
  projectId: string | undefined,
  requestHeaders: Headers,
  membership?: OrganizationMembership & { userId: string }
) {
  if (membership) {
    // The page already loaded this membership; every prefetch would otherwise
    // repeat the same SELECT before its own query.
    const { requestMemo } = await createORPCContext({
      headers: requestHeaders,
    });
    requestMemo.membershipByUserOrganization.set(
      `${membership.userId}:${organizationId}`,
      Promise.resolve({ id: membership.id, role: membership.role })
    );
  }

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
  void queryClient.prefetchQuery({
    ...dashboardOrpc.content.home.get.queryOptions({ input: homeInput }),
    queryFn: timedPrefetch("content.home.get", () =>
      client.content.home.get(homeInput)
    ),
  });
  void queryClient.prefetchQuery({
    ...dashboardOrpc.content.activeGenerations.list.queryOptions({
      input: organizationInput,
    }),
    queryFn: timedPrefetch("content.activeGenerations.list", () =>
      client.content.activeGenerations.list(organizationInput)
    ),
  });
  return dehydrate(queryClient);
}
