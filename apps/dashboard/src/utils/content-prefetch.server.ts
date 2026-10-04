import { createRouterClient } from "@orpc/server";
import { dehydrate } from "@tanstack/react-query";

import { createORPCContext } from "@/lib/orpc/context";
import { dashboardOrpc } from "@/lib/orpc/query";
import { contentRouter } from "@/lib/orpc/routers/content";
import type { LoadedMembership } from "@/types/auth/organization";
import { getGeoServerQueryClient } from "@/utils/geo-query-client.server";
import { seedMembership } from "@/utils/seed-membership.server";

export async function dehydrateContentDetailQueries(
  organizationId: string,
  contentId: string,
  requestHeaders: Headers,
  membership?: LoadedMembership
) {
  await seedMembership(organizationId, requestHeaders, membership);

  const client = createRouterClient(
    { content: contentRouter },
    { context: () => createORPCContext({ headers: requestHeaders }) }
  );
  const queryClient = getGeoServerQueryClient();
  const input = { organizationId, contentId };

  // Awaited: the route streams, so the document renders in the server HTML
  // without holding back the shell.
  await queryClient.prefetchQuery({
    ...dashboardOrpc.content.get.queryOptions({ input }),
    queryFn: () => client.content.get(input),
  });

  return dehydrate(queryClient);
}
