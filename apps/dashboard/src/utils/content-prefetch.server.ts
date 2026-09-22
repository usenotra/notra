import { createRouterClient } from "@orpc/server";
import { dehydrate } from "@tanstack/react-query";

import { createORPCContext } from "@/lib/orpc/context";
import { dashboardOrpc } from "@/lib/orpc/query";
import { contentRouter } from "@/lib/orpc/routers/content";
import type { OrganizationMembership } from "@/types/auth/organization";
import { getGeoServerQueryClient } from "@/utils/geo-query-client.server";

export async function dehydrateContentDetailQueries(
  organizationId: string,
  contentId: string,
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
    { content: contentRouter },
    { context: () => createORPCContext({ headers: requestHeaders }) }
  );
  const queryClient = getGeoServerQueryClient();
  const input = { organizationId, contentId };

  void queryClient.prefetchQuery({
    ...dashboardOrpc.content.get.queryOptions({ input }),
    queryFn: () => client.content.get(input),
  });

  return dehydrate(queryClient);
}
