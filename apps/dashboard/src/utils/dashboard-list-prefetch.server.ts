import { createRouterClient } from "@orpc/server";
import { dehydrate } from "@tanstack/react-query";

import { COLLECTIONS_PAGE_SIZE } from "@/constants/content-collections";
import { geoDbQueryKey } from "@/lib/db/geo-collections";
import { createORPCContext } from "@/lib/orpc/context";
import { dashboardOrpc } from "@/lib/orpc/query";
import { contentRouter } from "@/lib/orpc/routers/content";
import { geoRouter } from "@/lib/orpc/routers/geo";
import { integrationsRouter } from "@/lib/orpc/routers/integrations";
import { skillsRouter } from "@/lib/orpc/routers/skills";
import type { OrganizationMembership } from "@/types/auth/organization";
import { getGeoServerQueryClient } from "@/utils/geo-query-client.server";

type PrefetchMembership = OrganizationMembership & { userId: string };

/**
 * The page already loaded this membership. Seed it so each prefetched
 * procedure does not repeat the same SELECT.
 */
async function seedMembership(
  organizationId: string,
  requestHeaders: Headers,
  membership: PrefetchMembership | undefined
) {
  if (!membership) {
    return;
  }
  const { requestMemo } = await createORPCContext({
    headers: requestHeaders,
  });
  requestMemo.membershipByUserOrganization.set(
    `${membership.userId}:${organizationId}`,
    Promise.resolve({ id: membership.id, role: membership.role })
  );
}

function routerContext(requestHeaders: Headers) {
  return () => createORPCContext({ headers: requestHeaders });
}

/**
 * Starts the content list (and the project collection it scopes) during the
 * page render. Pending queries are dehydrated, so the browser reuses this
 * work instead of waiting for hydration and then a second round trip.
 */
export async function dehydrateContentListQueries(
  organizationId: string,
  projectId: string | undefined,
  page: number,
  requestHeaders: Headers,
  membership?: PrefetchMembership
) {
  await seedMembership(organizationId, requestHeaders, membership);
  const client = createRouterClient(
    { content: contentRouter, geo: geoRouter },
    { context: routerContext(requestHeaders) }
  );
  const queryClient = getGeoServerQueryClient();
  const organizationInput = { organizationId };
  const listInput = {
    organizationId,
    projectId,
    page,
    pageSize: COLLECTIONS_PAGE_SIZE,
  };

  void queryClient.prefetchQuery({
    queryKey: geoDbQueryKey("projects", organizationInput),
    queryFn: async () =>
      (await client.geo.projectsList(organizationInput)).projects,
  });
  void queryClient.prefetchQuery({
    ...dashboardOrpc.content.collections.list.queryOptions({
      input: listInput,
    }),
    queryFn: () => client.content.collections.list(listInput),
  });

  return dehydrate(queryClient);
}

export async function dehydrateIntegrationsQueries(
  organizationId: string,
  requestHeaders: Headers,
  membership?: PrefetchMembership
) {
  await seedMembership(organizationId, requestHeaders, membership);
  const client = createRouterClient(
    { integrations: integrationsRouter },
    { context: routerContext(requestHeaders) }
  );
  const queryClient = getGeoServerQueryClient();
  const input = { organizationId };

  void queryClient.prefetchQuery({
    ...dashboardOrpc.integrations.list.queryOptions({ input }),
    queryFn: () => client.integrations.list(input),
  });
  void queryClient.prefetchQuery({
    ...dashboardOrpc.integrations.mcp.list.queryOptions({ input }),
    queryFn: () => client.integrations.mcp.list(input),
  });
  void queryClient.prefetchQuery({
    ...dashboardOrpc.integrations.mcp.storeList.queryOptions({ input }),
    queryFn: () => client.integrations.mcp.storeList(input),
  });

  return dehydrate(queryClient);
}

export async function dehydrateSkillsQueries(
  organizationId: string,
  requestHeaders: Headers,
  membership?: PrefetchMembership
) {
  await seedMembership(organizationId, requestHeaders, membership);
  const client = createRouterClient(
    { skills: skillsRouter },
    { context: routerContext(requestHeaders) }
  );
  const queryClient = getGeoServerQueryClient();
  const input = { organizationId };

  void queryClient.prefetchQuery({
    ...dashboardOrpc.skills.list.queryOptions({ input }),
    queryFn: () => client.skills.list(input),
  });

  return dehydrate(queryClient);
}
