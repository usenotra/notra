import { createRouterClient } from "@orpc/server";
import { dehydrate } from "@tanstack/react-query";

import { geoDbQueryKey } from "@/lib/db/geo-collections";
import { createORPCContext } from "@/lib/orpc/context";
import { dashboardOrpc } from "@/lib/orpc/query";
import { contentRouter } from "@/lib/orpc/routers/content";
import { geoRouter } from "@/lib/orpc/routers/geo";
import { getGeoServerQueryClient } from "@/utils/geo-query-client.server";

/**
 * Starts the data needed above the fold on the dashboard home page while the
 * server is already rendering it. Pending queries are dehydrated, so the shell
 * can stream immediately and the browser reuses the work instead of starting a
 * projects request followed by a second content request.
 */
export async function dehydrateDashboardHomeQueries(
  organizationId: string,
  projectId: string | undefined,
  requestHeaders: Headers
) {
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
    queryFn: async () =>
      (await client.geo.projectsList(organizationInput)).projects,
  });
  void queryClient.prefetchQuery({
    ...dashboardOrpc.content.home.get.queryOptions({ input: homeInput }),
    queryFn: () => client.content.home.get(homeInput),
  });
  void queryClient.prefetchQuery({
    ...dashboardOrpc.content.activeGenerations.list.queryOptions({
      input: organizationInput,
    }),
    queryFn: () => client.content.activeGenerations.list(organizationInput),
  });
  return dehydrate(queryClient);
}
