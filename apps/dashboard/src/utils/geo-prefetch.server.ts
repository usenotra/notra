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

  return dehydrate(queryClient);
}
